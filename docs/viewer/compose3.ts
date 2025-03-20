import { ExpandNewNode, InputNode, TreeNode } from "./compose2";
import { describe, each, it } from "./test/util/cappucino";
import { expect } from "chai";

function MakeInputNode(path: string)
{
    return {
        path,
        children: {},
        inherits: {},
        attributes: {}
    } as InputNode;
}

function AddChild(nodes: Map<string, InputNode>, path: string, name: string, cs: string)
{
    if (!nodes.has(path))
    {
        nodes.set(path, MakeInputNode(path));
    }
    nodes.get(path)!.children[name] = cs;
}

function AddInherits(nodes: Map<string, InputNode>, path: string, name: string, cs: string)
{
    if (!nodes.has(path))
    {
        nodes.set(path, MakeInputNode(path));
    }
    nodes.get(path)!.inherits[name] = cs;
}

function AddAttribute(nodes: Map<string, InputNode>, path: string, name: string, attr: any)
{
    if (!nodes.has(path))
    {
        nodes.set(path, MakeInputNode(path));
    }
    nodes.get(path)!.attributes[name] = attr;
}

function NodeToJSON(node: TreeNode)
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

function PrintNode(node: TreeNode)
{
    console.log(JSON.stringify(NodeToJSON(node), null, 4));
}

describe("composition expansion", () => {

    it("adds children", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "parentclass", "child", "childclass");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child).to.exist;
    });

    it("rejects cycles", () => {
        let nodes = new Map<string, InputNode>();

        AddInherits(nodes, "childclass", "ih", "parentclass");
        AddInherits(nodes, "parentclass", "ih", "childclass");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child).to.exist;
    });

    it("adds children of children", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "childclass", "child2", "otherchildclass");
        AddChild(nodes, "parentclass", "child1", "childclass");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child1.children.child2).to.exist;
    });

    it("adds children of child path", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "parentclass/child1", "child2", "otherchildclass");
        AddChild(nodes, "parentclass", "child1", "childclass");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child1.children.child2).to.exist;
    });

    it("adds children of inherit", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "inheritedclass", "child", "otherchildclass");
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child).to.exist;
    });

    it("adds children of child path of inherit", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "inheritedclass/child", "child2", "otherchildclass");
        AddChild(nodes, "inheritedclass", "child", "otherchildclass");
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child.children.child2).to.exist;
    });

    it("adds children of nested inherit", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass1");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child).to.exist;
    });

    it("adds children of deep inherit path", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "otherchildclass2", "child3", "otherchildclass3");
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child3).to.exist;
    });

    it("adds children of deep inherit path with nesting", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "otherchildclass/child2", "child3", "otherchildclass3");
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddInherits(nodes, "parentclass", "inherit1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child3).to.exist;
    });

    it("adds children of deep child path with nesting", () => {
        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "otherchildclass/child2", "child3", "otherchildclass3");
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddChild(nodes, "parentclass", "child1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child1.children.child3).to.exist;
    });

    it("adds attributes of deep child path with nesting", () => {
        let nodes = new Map<string, InputNode>();

        AddAttribute(nodes, "otherchildclass/child2", "attr", true);
        AddChild(nodes, "otherchildclass", "child2", "otherchildclass2");
        AddChild(nodes, "inheritedclass2", "child", "otherchildclass");
        AddInherits(nodes, "inheritedclass1", "inherit2", "inheritedclass2");
        
        AddChild(nodes, "parentclass", "child1", "inheritedclass1/child/child2");

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.children.child1.attributes.attr).to.exist;
    });

    it("overrides inherited attributes with direct attributes", () => {
        let nodes = new Map<string, InputNode>();

        AddAttribute(nodes, "otherchildclass", "attr", 1);
        AddInherits(nodes, "parentclass", "ih", "otherchildclass");

        AddAttribute(nodes, "parentclass", "attr", 2);

        let root = NodeToJSON(ExpandNewNode("parentclass", nodes));
        expect(root.attributes.attr).to.equal(2);
    });
    
    it("adds children of children", () => {

        let nodes = new Map<string, InputNode>();

        AddChild(nodes, "obj1", "c3", "obj4");
        AddChild(nodes, "obj1", "c4", "obj5");

        AddChild(nodes, "obj1/c3", "c7", "obj5");
        
        AddInherits(nodes, "a", "i1", "obj1");
        AddChild(nodes, "a", "c1", "obj2");
        AddChild(nodes, "a", "c2", "obj3");

        AddChild(nodes, "a/c4", "c8", "obj5");

        let root = NodeToJSON(ExpandNewNode("a", nodes));
        expect(root.children.c3.children.c7).to.exist;
        expect(root.children.c4.children.c8).to.exist;
        expect(root.children.c1).to.exist;
        expect(root.children.c2).to.exist;
    });
})