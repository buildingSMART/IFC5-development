# (C) buildingSMART International
# published under MIT license 

from dataclasses import dataclass, fields
import functools
import re
import sys
import json

# Load JSON data
data = json.load(open(sys.argv[1]))
out = open(sys.argv[2], 'w')
oldprint = print
print = functools.partial(oldprint, file=out)

# Print the DOT graph
print("digraph G {")
print('    node [shape=plaintext];')

# Store nodes for later use
nodes = {}
edges = []

@dataclass(frozen=True)
class edge:
    node0 : str
    node1 : str
    style : str
    label : str
    reversed : bool = False
    hierarchical : bool = True
    width: float = 1

    def __iter__(self):
        return (getattr(self, field.name) for field in fields(self))

# Process the nodes
for idx, item in enumerate(data):
    name = item.get("name")
    if name is None:
        continue

    if item.get('def') == 'over':
        unique_name = name + f"_{idx}"
        edges.append(edge(name, unique_name, "solid", "over", True))
        name = unique_name

    N = item.get('name')
    N = f'<b>{N}</b>'

    if item.get("type"):
        N = '<i>' + item['type'] + "</i><br/>" + N
    
    if item.get("def"):
        N = item['def'] + " " + N

    label = f"<table border='0' cellborder='1' cellspacing='0'>"

    if item.get('def') != 'over':
        label += f"<tr><td colspan='2'>{N}</td></tr>"
    
    if "attributes" in item:
        for attr, value in item["attributes"].items():
            num_retained = 0
            for k, v in value.items():
                if isinstance(v, dict) and v.keys() == {'ref'}:
                    ref = re.sub('<|>|/', '', next(iter(v.values())))
                    # hier = material:binding
                    # outputs:surface.connect
                    edges.append(edge(name, ref, "solid", k, hierarchical=True))
                else:
                    value_str = json.dumps(v)
                    if k == "originalStepInstance":
                        value_str = '#' + value_str.split('#')[1]
                    if len(value_str) > 35:
                        value_str = value_str[:16] + "..." + value_str[-16:]
                    value_str = value_str.replace('"', '&quot;')
                    label += f"<tr><td>{attr}:{k}</td><td>{value_str}</td></tr>"
                    num_retained += 1
            if num_retained == 0:
                label += f"<tr><td><i>API</i></td><td><i>{attr}</i></td></tr>"

    
    label += "</table>"
    
    # Create node with HTML label
    nodes[name] = label
    
    # Process children relationships
    if "children" in item:
        for child in item["children"]:
            target = name + "sub" + child["name"]
            nodes[target] = child["name"]
            edges.append(edge(name, target, "solid", "subprim")) # , width=3
            if "inherits" in child:
                for inherit in child["inherits"]:
                    target2 = inherit.strip("</>")
                    edges.append(edge(target, target2, "dashed", "inherits"))


    # Process inheritance relationships
    if "inherits" in item:
        for inherit in item["inherits"]:
            target = inherit.strip("</>")
            edges.append(edge(name, target, "dashed", "inherits"))

# Print nodes
for name, label in nodes.items():
    print(f'    "{name}" [label=<{label}>];')

# Print edges
for source, target, edge_style, label, is_reversed, is_hierarchical, width in edges:
    print(f'    "{source}" -> "{target}" [label="{label}", penwidth={width}, style="{edge_style}"{", dir=back" if is_reversed else ""}{", constraint=false" if not is_hierarchical else ""}];')

print("}")
