import { ComposeNodeFromInput } from "../ifcx-core/composition/compose";
import { describe, it } from "./util/cappucino";
import { expect } from "chai";
import { SchemasToOpenAPI } from "../ifcx-core/schema/schema-export";
import { ExampleFile, ExampleFileMissingSchema, ExampleFileWithSchema } from "./example-file";
import { IfcxFile } from "../ifcx-core/schema/schema-helper";
import { NodeToJSON } from "./util/node2json";
import { CompositionInputNode, PostCompositionNode } from "../ifcx-core/composition/node";
import { CycleError } from "../ifcx-core/composition/cycles";


function MakeInputNode(path: string)
{
    return {
        path,
        children: {},
        inherits: {},
        attributes: {}
    } as CompositionInputNode;
}

function AddChild(nodes: Map<string, CompositionInputNode[]>, path: string, name: string, cs: string | null)
{
    if (!nodes.has(path))
    {
        nodes.set(path, [MakeInputNode(path)]);
    }
    nodes.get(path)![0].children[name] = cs;
}

function AddInherits(nodes: Map<string, CompositionInputNode[]>, path: string, name: string, cs: string | null)
{
    if (!nodes.has(path))
    {
        nodes.set(path, [MakeInputNode(path)]);
    }
    nodes.get(path)![0].inherits[name] = cs;
}

function AddAttribute(nodes: Map<string, CompositionInputNode[]>, path: string, name: string, attr: any)
{
    if (!nodes.has(path))
    {
        nodes.set(path, [MakeInputNode(path)]);
    }
    nodes.get(path)![0].attributes[name] = attr;
}


function PrintNode(node: PostCompositionNode)
{
    console.log(JSON.stringify(NodeToJSON(node), null, 4));
}

describe("composition expansion", () => {

    it("adds children", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "parentclass", "child", "childclass");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child).to.exist;
    });

    it("rejects cycles", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddInherits(nodes, "childclass", "ih", "parentclass");
        AddInherits(nodes, "parentclass", "ih", "childclass");

        expect(() => ComposeNodeFromInput("parentclass", nodes)).to.throw(CycleError);
    });

    it("adds children of children", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "childclass", "child2", "otherchildclass");
        AddChild(nodes, "parentclass", "child1", "childclass");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child1.children.child2).to.exist;
    });

    it("adds children of child path", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "parentclass/child1", "child2", "otherchildclass");
        AddChild(nodes, "parentclass", "child1", "childclass");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child1.children.child2).to.exist;
    });

    it("adds children of inherit", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "inheritedclass", "child", "otherchildclass");
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child).to.exist;
    });

    it("adds children of child path of inherit", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "inheritedclass/child", "child2", "otherchildclass");
        AddChild(nodes, "inheritedclass", "child", "otherchildclass");
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child.children.child2).to.exist;
    });

    it("adds children of nested inherit", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass1");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child).to.exist;
    });

    it("adds children of deep inherit path", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "otherchildclass2", "child3", "otherchildclass3");
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child3).to.exist;
    });

    it("adds children of deep inherit path with nesting", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "otherchildclass/child2", "child3", "otherchildclass3");
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child3).to.exist;
    });

    it("adds children of deep child path with nesting", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "otherchildclass/child2", "child3", "otherchildclass3");
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddChild(nodes, "parentclass", "child1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child1.children.child3).to.exist;
    });

    it("adds attributes of deep child path with nesting", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddAttribute(nodes, "otherchildclass/child2", "attr", true);
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddChild(nodes, "parentclass", "child1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.child1.attributes.attr).to.exist;
    });

    it("overrides inherited attributes with direct attributes", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddAttribute(nodes, "otherchildclass", "attr", 1);
        AddInherits(nodes, "parentclass", "ih", "otherchildclass");

        AddAttribute(nodes, "parentclass", "attr", 2);

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.attributes.attr).to.equal(2);
    });

    it("delete removes children in order", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "parentclass", "c1", null);
        AddChild(nodes, "parentclass", "c1", "child");
        AddChild(nodes, "parentclass", "c2", "child");
        AddChild(nodes, "parentclass", "c2", null);

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.children.c1).to.exist;
        expect(root.children.c2).to.not.exist;
    });

    it("delete removes attributes in order", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddAttribute(nodes, "parentclass", "a1", null);
        AddAttribute(nodes, "parentclass", "a1", "a");
        AddAttribute(nodes, "parentclass", "a2", "a");
        AddAttribute(nodes, "parentclass", "a2", null);

        let root = NodeToJSON(ComposeNodeFromInput("parentclass", nodes));
        expect(root.attributes.a1).to.exist;
        expect(root.attributes.a2).to.not.exist;
    });

    it("delete removes inherits in order", () => {
        let nodes = new Map<string, CompositionInputNode[]>();

        AddAttribute(nodes, "a", "a1", "a");

        AddInherits(nodes, "c1", "i1", null);
        AddInherits(nodes, "c1", "i1", "a");
        AddInherits(nodes, "c2", "i2", "a");
        AddInherits(nodes, "c2", "i2", null);

        let c1 = NodeToJSON(ComposeNodeFromInput("c1", nodes));
        let c2 = NodeToJSON(ComposeNodeFromInput("c2", nodes));

        expect(c1.attributes.a1).to.exist;
        expect(c2.attributes.a1).to.not.exist;
    });

    it("adds children of children", () => {

        let nodes = new Map<string, CompositionInputNode[]>();

        AddChild(nodes, "obj1", "c3", "obj4");
        AddChild(nodes, "obj1", "c4", "obj5");

        AddChild(nodes, "obj1/c3", "c7", "obj5");
        
        AddInherits(nodes, "a", "i1", "obj1");
        AddChild(nodes, "a", "c1", "obj2");
        AddChild(nodes, "a", "c2", "obj3");

        AddChild(nodes, "a/c4", "c8", "obj5");

        let root = NodeToJSON(ComposeNodeFromInput("a", nodes));
        expect(root.children.c3.children.c7).to.exist;
        expect(root.children.c4.children.c8).to.exist;
        expect(root.children.c1).to.exist;
        expect(root.children.c2).to.exist;
    });
})

export function DefaultFile(valueOfAttribute: any)
{
    return {
        header: {
            id: "",
            version: "",
            author: "",
            timestamp: ""
        },
        imports: [],
        schemas: {
            "attribute": {
                uri: "http://www.example.com/attribute",
                value: {
                    dataType: "String"
                }
            },
            "fixed_attribute": {
                uri: "http://www.example.com/fixed_attribute",
                value: {
                    dataType: "Boolean"
                }
            },
        },
        data: [{
            path: "root",
            children: {},
            inherits: {},
            attributes: {
                "attribute": valueOfAttribute,
                "fixed_attribute": true
            }
        }]
    } as IfcxFile;
}
