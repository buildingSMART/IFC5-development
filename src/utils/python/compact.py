import collections
import json
import sys, re

ifn, ofn = sys.argv[1:]

di = json.load(open(ifn))
mapping = collections.defaultdict(list)
grouping = collections.defaultdict(list)


for N in (n for n in di['data'] if 'attributes' in n and not 'children' in n):
    grouping[N['path']].extend(N['attributes'].items())


for k, v in grouping.items():
    mapping[json.dumps(dict(sorted(v)))].append(k)

print(*map(len, mapping.values()))

mapping2 = {}

for srcs in (vs for vs in mapping.values() if len(vs) > 1):
    tgt, *srcs = srcs
    for src in srcs:
        if src != tgt:
            mapping2[src] = tgt


print(*mapping2.keys())

def transform(node):
    if 'children' in node:
        return {
            **node,
            **{"children": {n:mapping2.get(c, c) for n, c in node['children'].items()}}
        }
    elif node['path'] in mapping2:
        return None
    else:
        return node

di['data'] = list(filter(None, map(transform, di['data'])))

s = json.dumps(di, indent=2)
s = re.sub('\n\s+([\-\+\d\.e]+|\])(,?)(?=\n)', '\\1\\2', s)

with open(ofn, 'w') as f:
    print(s, file=f)
