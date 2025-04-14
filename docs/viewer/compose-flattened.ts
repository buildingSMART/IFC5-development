import { components } from "../../schema/out/ts/ifcx";
import { Federate, LoadIfcxFile } from "./workflow-alpha";
import { TreeNode } from "./compose-alpha";
import { ComposedObject } from "./composed-object";

type IfcxFile = components["schemas"]["IfcxFile"];

function TreeNodeToComposedObject(path: string, node: TreeNode): ComposedObject
{
    let co = {
        name: path, 
        attributes: {}, 
        children: []
    } as ComposedObject;

    node.children.forEach((childNode, childName) => {
        co.children?.push(TreeNodeToComposedObject(`${path}/${childName}`, childNode));
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
            co.attributes[attrName] = attr;
        }
    })

    if (Object.keys(co.attributes).length === 0) delete co.attributes;

    return co;
}

export function compose3(files: IfcxFile[])
{
    let federated = Federate(files);
    let tree = LoadIfcxFile(federated, true, true);
    return TreeNodeToComposedObject("", tree);
}