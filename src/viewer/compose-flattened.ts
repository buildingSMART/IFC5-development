import { ComposedObject } from "./composed-object";
import { IfcxFile, IfcxSchema } from "../ifcx-core/schema/schema-helper";
import { PostCompositionNode } from "../ifcx-core/composition/node";
import { InMemoryLayerProvider, StackedLayerProvider } from "../ifcx-core/layers/layer-providers";
import { FetchLayerProvider } from "../ifcx-core/layers/fetch-layer-provider";
import { IfcxLayerStackBuilder } from "../ifcx-core/layers/layer-stack";

function TreeNodeToComposedObject(path: string, node: PostCompositionNode, schemas: {[key: string]: IfcxSchema}): ComposedObject
{
    let co = {
        name: path, 
        attributes: {}, 
        children: []
    } as ComposedObject;

    node.children.forEach((childNode, childName) => {
        co.children?.push(TreeNodeToComposedObject(`${path}/${childName}`, childNode, schemas));
    });

    node.attributes.forEach((attr, attrName) => {
        // flatten
        if (attr && typeof attr === "object" && !Array.isArray(attr))
        {
            Object.keys(attr).forEach((compname) => {
                co.attributes[`${attrName}::${compname}`] = attr[compname];
            });
        }
        else
        {
            // basic unit support for non-nested attributes
            let schema = schemas[attrName];
            if (schema && schema.value.quantityKind)
            {
                let postfix = "";
                let quantityKind = schema.value.quantityKind;

                if (quantityKind === "Plane angle")                     // Added
                {
                    postfix = String.fromCodePoint(0x00B0);
                }
                else if (quantityKind === "Thermodynamic temperature")  // Added
                {
                    postfix = String.fromCodePoint(0x00B0) + "K";
                }
                else if (quantityKind === "Celsius temperature")        // Added
                {
                    postfix = String.fromCodePoint(0x00B0) + "C";
                }
                else if (quantityKind === "Electric current")           // Added
                {
                    postfix = "A";
                }
                else if (quantityKind === "Time")                       // Added
                {
                    postfix = "s";
                }
                else if (quantityKind === "Frequency")                  // Added
                {
                    postfix = "Hz";
                }
                else if (quantityKind === "Mass")                       // Added
                {                                   // Though the prefix "Kilo" starts with an uppercase letter,
                    postfix = "kg";                 // the respective abbreviation/ SI-symbol doesn't/ isn't one
                }                                   // (unlike presented in 'quantity-kinds_source_table.xlsx')
                else if (quantityKind === "Length")
                {
                    postfix = "m";
                }
                else if (quantityKind === "Linear velocity")            // Added
                {
                    postfix = "m/s";
                }
                else if (quantityKind === "Force")                      // Added
                {
                    postfix = "N";
                }
                else if (quantityKind === "Pressure")                   // Added
                {
                    postfix = "Pa";
                }
                else if (quantityKind === "Area")                       // Added
                {
                    postfix = "m" + String.fromCodePoint(0x00B2);
                }
                else if (quantityKind === "Energy")                     // Added
                {
                    postfix = "J";
                }
                else if (quantityKind === "Power")                      // Added
                {
                    postfix = "W";
                }
                else if (quantityKind === "Volume")
                {
                    postfix = "m" + String.fromCodePoint(0x00B3);
                }
                else if (quantityKind === "Mass density")               // Added
                {
                    postfix = "kg/m" + String.fromCodePoint(0x00B3);
                }
                else if (quantityKind === "Thermal conductivity")       // Added
                {
                    postfix = "W/mK";
                }
                else if (quantityKind === "Thermal transmittance")      // Added
                {
                    postfix = "W/m" + String.fromCodePoint(0x00B2) + "K";
                }

/*              // Other option to the many "else if" - statements above

                switch(quantityKind) { 
                    case "Plane angle":
                    { 
                        postfix = String.fromCodePoint(0x00B0);
                        break;
                    }
                    case "Thermodynamic temperature":
                    { 
                        postfix = String.fromCodePoint(0x00B0) + "K";
                        break;
                    }
                    case "Celsius temperature":
                    { 
                        postfix = String.fromCodePoint(0x00B0) + "C";
                        break;
                    }
                    case "Electric current":
                    { 
                        postfix = "A";
                        break;
                    }
                    case "Time":
                    { 
                        postfix = "s";
                        break;
                    }
                    case "Frequency":
                    { 
                        postfix = "Hz";
                        break;
                    }
                    case "Mass":
                    { 
                        postfix = "kg";         // Though the prefix "Kilo" starts with an uppercase letter,
                        break;                  // the respective abbreviation/ SI-symbol doesn't/ isn't one
                    }                           // (unlike presented in 'quantity-kinds_source_table.xlsx')
                    case "Length":
                    { 
                        postfix = "m"; 
                        break;
                    }
                    case "Linear velocity":
                    { 
                        postfix = "m/s"; 
                        break;
                    }
                    case "Force":
                    { 
                        postfix = "N"; 
                        break;
                    }
                    case "Pressure":
                    { 
                        postfix = "Pa"; 
                        break;
                    }
                    case "Area":
                    { 
                        postfix = "m" + String.fromCodePoint(0x00B2); 
                        break; 
                    }
                    case "Energy":
                    { 
                        postfix = "J"; 
                        break; 
                    }
                    case "Power":
                    { 
                        postfix = "W"; 
                        break; 
                    }
                    case "Volume":
                    { 
                        postfix = "m" + String.fromCodePoint(0x00B3); 
                        break;
                    }
                    case "Mass density":
                    { 
                        postfix = "kg/m" + String.fromCodePoint(0x00B3); 
                        break;  
                    }
                    case "Thermal conductivity":
                    { 
                        postfix = "W/mK"; 
                        break;
                    }
                    case "Thermal transmittance":
                    { 
                        postfix = "W/m" + String.fromCodePoint(0x00B2) + "K"; 
                        break; 
                    }
                }
*/             
                co.attributes[attrName] = `${attr} ${postfix}`;
            }
            else
            {
                co.attributes[attrName] = attr;
            }
        }
    })

    if (Object.keys(co.attributes).length === 0) delete co.attributes;

    return co;
}

export async function compose3(files: IfcxFile[])
{
    let userDefinedOrder: IfcxFile = {
        header: {...files[0].header},
        imports: files.map(f => { return { uri: f.header.id }; }),
        schemas: {},
        data: []
    }

    userDefinedOrder.header.id = "USER_DEF";
    
    let provider = new StackedLayerProvider([
        new InMemoryLayerProvider().AddAll([userDefinedOrder, ...files]), 
        new FetchLayerProvider()
    ]);

    let layerStack = await (new IfcxLayerStackBuilder(provider).FromId(userDefinedOrder.header.id)).Build();

    if (layerStack instanceof Error)
    {
        throw layerStack;
    }
    
    // Add local path to attributes for lookup
    // @todo make this less insane
    layerStack.GetFederatedLayer().data.forEach((n, i) => {
      n.attributes = n.attributes || {};
      n.attributes[`__internal_${i}`] = n.path;
    });

    return TreeNodeToComposedObject("", layerStack.GetFullTree(), layerStack.GetSchemas());
}