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