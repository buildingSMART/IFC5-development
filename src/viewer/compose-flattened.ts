import { ComposedObject } from "./composed-object";
import { IfcxFile, IfcxSchema } from "../ifcx-core/schema/schema-helper";
import { PostCompositionNode } from "../ifcx-core/composition/node";
import { InMemoryLayerProvider, StackedLayerProvider } from "../ifcx-core/project/layer-providers";
import { FetchLayerProvider } from "../ifcx-core/project/fetch-layer-provider";
import { IfcxProjectBuilder } from "../ifcx-core/project/project";

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
    let provider = new StackedLayerProvider([
        new InMemoryLayerProvider().AddAll(files), 
        new FetchLayerProvider()
    ]);

    let project = await (new IfcxProjectBuilder(provider).FromId(files[0].header.id)).Build();

    if (project instanceof Error)
    {
        throw project;
    }

    return TreeNodeToComposedObject("", project.GetFullTree(), project.GetSchemas());
}