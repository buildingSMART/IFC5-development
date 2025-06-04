import functools
import itertools
import operator
import sys
import json
import uuid


def transform_iden(s):
    postfix = None
    if len(s) < 33:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, s))

    s = s[1:]
    if len(s) > 32:
        s, postfix = s.split("_")

    u = uuid.UUID(s)
    if postfix:
        u = uuid.uuid5(u, postfix)
    return str(u)


def transform_attributes(d):
    mapping = {
        "info:id": None,
        "outputs:surface": None,
        "outputs:surface.connect": None,
        "inputs:diffuseColor": "bsi:ifc:v5a:presentation:diffuseColor",
        "inputs:opacity": "bsi:ifc:v5a:presentation:opacity",
    }

    def transform(k, v):
        if mapping.get(k, "-") is None:
            return
        k = mapping.get(k, k)
        if k == "ref":
            parts = v[2:-1].split("/")
            v = "/".join([transform_iden(parts[0])] + parts[1:])

        kvs = []

        if k == "xformOp":
            k = "usd::xformop"
        else:
            parts = k.split(":")
            try:
                parts.remove("VisibilityAPI")
            except:
                pass

            for i in range(len(parts) - (0 if isinstance(v, dict) else 1)):
                parts[i] = parts[i].lower()

            if parts and parts[0] == 'ifc5':
                parts[0:1] = ['bsi', 'ifc', 'v5a']
                if 'properties' in parts or 'system' in parts:
                    if 'properties' in parts:
                        parts[parts.index('properties')] = 'prop'
                    for kk, vv in v.items():
                        if kk.lower() == 'isexternal':
                            vv = bool(vv)
                        kvs.append((parts + [kk.lower()], vv))
            
            if not kvs:
                kvs.append((parts, v))

        if not kvs:
            kvs.append((k, v))

        for k, v in kvs:
            if isinstance(k, list):
                k = "::".join(k)

            if k.startswith("usd") and not k.startswith("usd::"):
                k = "usd::" + k

            if isinstance(v, dict):
                v = transform_attributes(v)
                if not v:
                    continue
            elif isinstance(v, list) and set(map(type, v)) == {dict}:
                v = list(filter(None, map(transform_attributes, v)))
                # ? if not v:
                # ?     continue

            yield k, v

    return dict(itertools.chain.from_iterable(itertools.starmap(transform, d.items())))


def process():
    model = json.load(open(sys.argv[1]))
    originalInstanceNames = dict(map(lambda s: (s[0], s[1].split('=')[1].split('(')[0]), filter(lambda s: s[1], [(d.get('name'), d.get('attributes', {}).get('customdata', {}).get('originalStepInstance')) for d in model])))
    def nameInherit(i, n, ref):
        if n == 1 and ref in originalInstanceNames:
            r = originalInstanceNames[ref]
            return f'{r[3].lower()}{r[4:]}'
        else:
            return f'inh_{i}'
    for elem in model:
        if "disclaimer" in elem:
            continue

        if elem.get('name') is not None and elem.get('def') == 'def' and len(elem.get('inherits', ())) == 1:
            # handle root node differently: inherit becomes named child to retain root name
            yield {
                "path": transform_iden(elem["name"]),
                "children": {elem["name"]: transform_iden(elem['inherits'][0][2:-1])}
            }
            continue

        children = list(filter(lambda c: c.get("inherits"), elem.get("children", [])))

        # Children should inherit immediately to a node in the root to flatten the exchange structure.
        # In case of material/shader this wasn't fully compliant yet.
        weird_children = filter(lambda c: not c.get("inherits"), elem.get("children", []))
        weird_child_attrs = functools.reduce(
            operator.or_,
            (c.get("attributes") or {} for c in filter(lambda c: not c.get("inherits"), weird_children)),
            {},
        )

        attributes = {**weird_child_attrs, **(elem.get("attributes") or {})}

        if (attributes and transform_attributes(attributes)) or elem.get("inherits") or children:
            yield {
                "path": transform_iden(elem["name"]),
                **(
                    {"attributes": transform_attributes(attributes)}
                    if attributes and transform_attributes(attributes)
                    else {}
                ),
                **(
                    {"inherits": dict((nameInherit(k, len(elem["inherits"]), v[2:-1]), transform_iden(v[2:-1])) for k, v in enumerate(elem["inherits"]))}
                    if elem.get("inherits")
                    else {}
                ),
                **(
                    {"children": dict((d["name"], transform_iden(d["inherits"][0][2:-1])) for d in children)}
                    if children
                    else {}
                ),
            }


def fold(k, vs):
    raise NotImplementedError


items = list(process())

if False:
    items = list(
        itertools.starmap(
            fold,
            itertools.groupby(
                sorted(items, key=operator.attrgetter("path")),
                key=operator.attrgetter("path"),
            ),
        )
    )

json.dump(
    {
        "header": {
            "version": "ifcx_alpha",
            "author": "authorname",
            "timestamp": "time string",
        },
        "schemas": {},
        "data": items,
    },
    open(sys.argv[2], "w"),
    indent=2,
)
