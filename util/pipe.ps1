# python .\ifc4-to-usda.py .\original-files\bonsai-wall.ifc
# python .\usda-to-json.py .\original-files\bonsai-wall.usda .\original-files\bonsai-wall.json
python .\transform_prealpha_to_alpha.py .\original-files\bonsai-wall.json .\original-files\bonsai-wall-alpha.json
python .\calc_properties.py .\original-files\bonsai-wall-alpha.json .\original-files\bonsai-wall-props.json
python .\split_window_bodies.py .\original-files\bonsai-wall-props.json .\original-files\bonsai-wall-props-materials.json
python .\rewrite_materials.py .\original-files\bonsai-wall-props-materials.json .\original-files\bonsai-wall-props-materials-rewrite.json
python .\populate_schema.py .\original-files\bonsai-wall-props-materials-rewrite.json .\original-files\bonsai-wall-props-schema.json
python .\externalise_schema.py .\original-files\bonsai-wall-props-schema.json .\original-files\bonsai-wall-props-schema-external.json
mv -Force .\original-files\bonsai-wall-props-schema-external.json '..\Hello Wall\hello-wall.ifcx'
python .\Ifcx2PlantUML.py '..\Hello Wall\hello-wall.ifcx' x.svg x.png
