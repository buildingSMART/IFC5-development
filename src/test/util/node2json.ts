import { PostCompositionNode } from "../../ifcx-core/composition/node";

export function NodeToJSON(node: PostCompositionNode)
{
    let obj: any = {};
    obj.node = node.node;
    obj.children = {};
    obj.attributes = {};
    [...node.children.entries()].forEach(c => {
        obj.children[c[0]] = NodeToJSON(c[1]);
    });
    [...node.attributes.entries()].forEach(c => {
        obj.attributes[c[0]] = c[1];
    });
    return obj;
}