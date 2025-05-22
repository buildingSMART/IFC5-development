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
        "inputs:diffuseColor": "bsi:ifc:v5a:schema:presentation:diffuseColor",
        "inputs:opacity": "bsi:ifc:v5a:schema:presentation:opacity",
    }

    def transform(k, v):
        if mapping.get(k, "-") is None:
            return None
        k = mapping.get(k, k)
        if k == "ref":
            parts = v[2:-1].split("/")
            v = "/".join([transform_iden(parts[0])] + parts[1:])

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
                if 'properties' in parts:
                    parts[parts.index('properties')] = 'prop'
                    assert len(v) == 1
                    kk, vv = next(iter(v.items()))
                    parts.append(kk.lower())
                    v = bool(vv)
                else:
                    parts.insert(3, 'schema')
            k = "::".join(parts)

            if k.startswith("usd"):
                k = "usd::" + k

        if isinstance(v, dict):
            v = transform_attributes(v)
            if not v:
                return None
        return k, v

    return dict(filter(None, itertools.starmap(transform, d.items())))


def process():
    for elem in json.load(open(sys.argv[1])):
        if "disclaimer" in elem:
            continue

        print(elem["name"], "->", transform_iden(elem["name"]))

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
                    {"inherits": dict((f"i{k}", transform_iden(v[2:-1])) for k, v in enumerate(elem["inherits"]))}
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
