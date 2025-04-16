import json
import sys

def truncate_value(value):
    if len(value) <= 50:
        return value
    return value[:30] + " [...] " + value[-20:]

def is_shader(identifier):
    return identifier.endswith("/Shader")

def get_base_id(identifier):
    return identifier[:-7]  # Remove "/Shader" suffix


# IFCX_PATH = sys.argv[1] # r"C:/.../hello-wall.ifcx"
IFCX_PATH = r"C:/Code/IFC/IFC5_experiments/IFC5parser/hello-wall.ifcx"
with open(IFCX_PATH, 'r') as f:
    data = json.load(f)

objects = {}
class_attributes = {}
material_bindings = []
shader_relations = []

for obj in data['data']:
    identifier = obj['identifier']
    
    if identifier not in class_attributes:
        class_attributes[identifier] = {'green': [], 'blue': [], 'yellow': []}
    
    if 'attributes' in obj:
        for attr_name, attr_value in obj['attributes'].items():

            if attr_name == "usd::usdshade::materialbindingapi":
                if isinstance(attr_value, dict) and "material::binding" in attr_value:
                    binding = attr_value["material::binding"]
                    if isinstance(binding, dict) and "ref" in binding:
                        material_bindings.append((identifier, binding["ref"]))
                continue
            
            str_value = str(attr_value)
            truncated_value = truncate_value(str_value)
            if attr_name.startswith('bsi'):
                class_attributes[identifier]['green'].append((attr_name, truncated_value))
            elif attr_name.startswith('usd'):
                class_attributes[identifier]['blue'].append((attr_name, truncated_value))
            else:
                class_attributes[identifier]['yellow'].append((attr_name, truncated_value))

# Collect shader relations
for identifier in class_attributes.keys():
    if is_shader(identifier):
        base_id = get_base_id(identifier)
        if base_id in class_attributes:
            shader_relations.append((base_id, identifier))

plantuml_file = IFCX_PATH.replace('.ifcx', '.plantuml')
with open(plantuml_file, 'w') as puml:
    puml.write('@startuml\n')
    
    for identifier, attributes in class_attributes.items():
        if is_shader(identifier):
            puml.write(f'stereotype "{identifier}" {{\n')
        else:
            puml.write(f'class {identifier} {{\n')
        
        # Write green attributes (bsi)
        for attr_name, attr_value in attributes['green']:
            puml.write(f'  + "{attr_name}" : "{attr_value}"\n')
        
        # Write blue-private attributes (usd)
        for attr_name, attr_value in attributes['blue']:
            puml.write(f'  ~ "{attr_name}" : "{attr_value}"\n')
        
        # Write yellow attributes (all else)
        for attr_name, attr_value in attributes['yellow']:
            puml.write(f'  # "{attr_name}" : "{attr_value}"\n')
        
        puml.write('}\n\n')
    
    for obj in data['data']:
        identifier = obj['identifier']
        
        if 'children' in obj:
            for child_name, child_id in obj['children'].items():
                puml.write(f'"{identifier}" --> "child:{child_name}" "{child_id}"\n')
        
        if 'inherits' in obj:
            for inherit_name, inherit_id in obj['inherits'].items():
                puml.write(f'"{identifier}" --o "inherits" "{inherit_id}"\n')
    
    for source_id, target_id in material_bindings:
        puml.write(f'"{source_id}" --|> "madeOf" "{target_id}"\n')
    
    for base_id, shader_id in shader_relations:
        puml.write(f'"{base_id}" o..o "{shader_id}"\n')
    
    puml.write('@enduml\n')