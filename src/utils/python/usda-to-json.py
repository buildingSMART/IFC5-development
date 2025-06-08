import collections
import functools
import operator
import re
import sys
from lark import Lark, Transformer, v_args, Tree
import json

usda_grammar = r"""
    start: meta? statement*

    statement: assignment
             | block

    assignment: "prepend"? "custom"? "uniform"? type "[]"? NAME ("=" (value))?

    block: DEFTYPE NAME? STRING metadef? scope
    type: NAME

    metadef: "(" statement* ")"
    scope: "{" statement* "}"

    DEFTYPE: ("def"|"class"|"over")
    
    REFERENCE: /<[^>]+>/

    value: STRING
          | NUMBER
          | REFERENCE
          | "true" -> true
          | "false" -> false
          | "[" [value ("," value)*] ","? "]" -> array
          | "(" [value ("," value)*] ")" -> array

    NAME: /[A-Za-z_][A-Za-z_:\.\d]*/
    STRING: /".*?"/
    NUMBER: /-?\d+(\.\d+)?([eE][+-]?\d+)?/

    meta: "(" (STRING | (/[A-Za-z_]+/ "=" value))+ ")"

    %import common.WS
    %ignore WS
    %ignore "#" /.+/
"""

parser = Lark(usda_grammar, start='start', parser='earley')

class USDAtoJSON(Transformer):
    def start(self, items):
        return {
            'children': [d for d in items if len(d)]
        }
    
    def statement(self, items):
        return items[0]
    
    def assignment(self, items):
        try:
            key = items[1].value
        except:
            breakpoint()
        try:
            value = items[2]
        except:
            value = None
        if isinstance(value, dict) and "ref" in value:
            # references are always plural in USD
            value = [value]
        return {key: value}
    
    def block(self, items):
        metadef = next((i for i in items if isinstance(i, Tree) and i.data == 'metadef'), None)
        scope = next((i for i in items if isinstance(i, Tree) and i.data == 'scope'), None)
        subs = [d for d in scope.children if len(d) > 1] if scope and scope.children else []
        props = functools.reduce(dict.__or__, [d for d in scope.children if len(d) == 1], {}) if scope and scope.children else []
        inherits = []
        if metadef and metadef.children:
            vs = functools.reduce(operator.or_, metadef.children).get('inherits')
            if vs:
                if isinstance(vs, dict):
                    vs = [vs]
                inherits = [next(iter(v.values())) for v in vs]
        return {
            # @nb lark.lexer.Token inherits from str
            "def": items[0].value,
            "type": None if type(items[1]) == str else items[1].value,
            "name": items[1] if type(items[1]) == str else items[2],
            **({"inherits": inherits} if inherits else {}),
            **({"attributes": props} if props else {}),
            **({"children": subs} if subs else {})
        }
        
    def value(self, items):
        return items[0]
    
    def true(self, items):
        return True
    
    def false(self, items):
        return False
    
    def array(self, items):
        return items
    
    def meta(self, items):
        return {}

    @v_args(inline=True)
    def STRING(self, s):
        return s.strip('"')
    
    @v_args(inline=True)
    def NUMBER(self, n):
        return float(n) if '.' in n or 'e' in n or 'E' in n else int(n)

    @v_args(inline=True)
    def REFERENCE(self, r):
        return {
            'ref': r.value
        }

def parse_usda_to_dict(usda_content):
    parse_tree = parser.parse(re.sub(r'custom rel [\w:]+', '', usda_content))
    json_data = USDAtoJSON().transform(parse_tree)
    return json_data

usda_content = open(sys.argv[1]).read()

di = parse_usda_to_dict(usda_content)

ignored_attributes = {
    'faceVertexCounts': lambda attrs: all(i == 3 for i in attrs['faceVertexCounts']),
    'curveVertexCounts': lambda attrs: attrs['curveVertexCounts'] == [2],
    'xformOpOrder': lambda *_: True,
    'type': lambda *_: True,
    'widths': lambda *_: True,
}
namespace_binding = {
    'faceVertexIndices': 'UsdGeom:Mesh',
    'faceVertexCounts': 'UsdGeom:Mesh',
    'points': lambda attrs: 'UsdGeom:Mesh' if 'faceVertexIndices' in attrs else 'UsdGeom:BasisCurves',
    "curveVertexCounts": 'UsdGeom:BasisCurves',
    'visibility': 'UsdGeom:VisibilityAPI:visibility',
    'info:id': "UsdShade:Shader",
    'inputs:diffuseColor': "UsdShade:Shader",
    'inputs:opacity': "UsdShade:Shader",
    'outputs:surface': "UsdShade:Shader",
    'outputs:surface.connect': "UsdShade:Material",
    'material:binding': 'UsdShade:MaterialBindingAPI',

    'Mesh': 'UsdGeom:Mesh',
    'BasisCurves': 'UsdGeom:BasisCurves',
    "Shader": "UsdShade:Shader",
    "Material": "UsdShade:Material",
    "Xform": "UsdGeom:Xform",
}

overs = []
empties = set()
for node in di['children']:
    # three cases:
    #   - def of the root
    #   - class of a hierarchy node:  class { def* }
    #   - class of a non-hierarchy node  class { attr* }
    if node.get('type') and node.get('type') in namespace_binding:
        node['type'] = namespace_binding[node['type']]
    if node.get('attributes', None):
        attrs = node.pop('attributes')
        grouped_attrs = collections.defaultdict(dict)
        for k, v in attrs.items():
            if ns := namespace_binding.get(k):
                if callable(ns):
                    ns = ns(attrs)
            elif ':' in k:
                ns, k = k.rsplit(':', 1)
            else:
                ns = "UNKNOWN_COMPONENT"
            if fn := ignored_attributes.get(k):
                if fn(attrs):
                    continue
            grouped_attrs[ns][k] = v
        if node.get('def') == 'over':
            empties.add(id(node))
        for ch in node.get('children', ()):
            if ch.get('type') and ch.get('type') in namespace_binding:
                ch['type'] = namespace_binding[ch['type']]
            elif ch.get('type', False) is None:
                del ch['type']
        for ns, ats in grouped_attrs.items():
            overs.append({
                'def': 'over',
                'name': node['name'],
                'attributes': {
                    ns: ats
                }
            })

di = [c for c in di['children'] if id(c) not in empties] + overs

s = json.dumps(di, indent=1)
s = re.sub('\n\s+([\-\+\d\.e]+|\])(,?)(?=\n)', '\\1\\2', s)

with open(sys.argv[2], 'w') as f:
    print(s, file=f)
