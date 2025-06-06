import { components } from "../../schema/out/ts/ifcx";
import { Federate, FetchRemoteSchemas, LoadIfcxFile } from "./workflow-alpha";
import { TreeNode } from "./compose-alpha";
import { ComposedObject } from "./composed-object";

type IfcxFile = components["schemas"]["IfcxFile"];
type IfcxSchema = components["schemas"]["IfcxSchema"];

function TreeNodeToComposedObject(path: string, node: TreeNode, schemas: {[key: string]: IfcxSchema}): ComposedObject
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
                if (quantityKind === "Length")
                {
                    postfix = "m";
                }
                else if (quantityKind === "Volume")
                {
                    postfix = "m" + String.fromCodePoint(0x00B3);
                }
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
    let federated = Federate(files);
    await FetchRemoteSchemas(federated);
    let tree = LoadIfcxFile(federated, true, true);
    return TreeNodeToComposedObject("", tree, federated.schemas);
}