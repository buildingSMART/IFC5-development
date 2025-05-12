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
        s, postfix = s.split('_')
            
    u = uuid.UUID(s)
    if postfix:
        u = uuid.uuid5(u, postfix)
    return str(u)

def transform_attributes(d, prefix=""):
    def transform(k, v):
        if k == "ref":
            parts = v[2:-1].split('/')
            v = "/".join([transform_iden(parts[0])] + parts[1:])

        if k == "xformOp":
            k = "usd::xformop"
        else:
            parts = k.split(':')
            try: parts.remove('VisibilityAPI')
            except: pass
            for i in range(len(parts) - (0 if isinstance(v, dict) else 1)):
                parts[i] = parts[i].lower()
            k = '::'.join(parts)

            if k.startswith('usd'):
                k = "usd::" + k
            else:
                k = prefix + k

        if isinstance(v, dict):
            v = transform_attributes(v)
        return k, v
    return dict(itertools.starmap(transform, d.items()))

def process():
    for elem in json.load(open(sys.argv[1])):
        if "disclaimer" in elem:
            continue

        print(elem["name"], '->', transform_iden(elem["name"]))

        children = list(filter(lambda c: c.get("inherits"), elem.get("children", [])))

        if elem.get("attributes") or elem.get("inherits") or children:
            yield {
                "identifier": transform_iden(elem["name"]),
                **({"attributes": transform_attributes(elem["attributes"])} if elem.get("attributes") else {}),
                **({"inherits": dict((f"i{k}", transform_iden(v[2:-1])) for k, v in enumerate(elem["inherits"]))} if elem.get("inherits") else {}),
                **({"children": dict((d["name"], transform_iden(d["inherits"][0][2:-1])) for d in children)} if children else {}),
            }

        weird_children = filter(lambda c: not c.get("inherits"), elem.get("children", []))
        for ch in weird_children:
            yield {
                "identifier": transform_iden(elem["name"]) + "/Shader",
                **({"attributes": transform_attributes(ch["attributes"], prefix="usd::materials::")} if ch.get("attributes") else {}),
            }


def fold(k, vs):
    raise NotImplementedError


items = list(process())

if False:
    items = list(itertools.starmap(fold, itertools.groupby(sorted(items, key=operator.attrgetter('identifier')), key=operator.attrgetter('identifier'))))

json.dump({
    "header": {
        "version": "ifcx_alpha",
        "author": "authorname",
        "timestamp": "time string"
    },
    "schemas": {},
    "data": items
}, open(sys.argv[2], 'w'), indent=2)
