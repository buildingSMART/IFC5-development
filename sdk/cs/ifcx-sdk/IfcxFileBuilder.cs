using QuickType;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ifcx_sdk
{
    public class NodeElementBuilder
    {
        NodeElement node;

        public NodeElementBuilder(string path)
        {
            this.node = new NodeElement();
            this.node.Path = path;
            this.node.Inherits = new();
            this.node.Attributes = new();
            this.node.Children = new();
        }

        public NodeElementBuilder AddChild(Opinion op, string name, string value)
        {
            var c = new ChildElement();
            c.Opinion   = op;
            c.Name = name; 
            c.Value = value;
            this.node.Children.Add(c);
            
            return this;
        }

        public NodeElement Build()
        {
            return this.node;
        }
    }

    public class IfcxFileBuilder
    {
        IfcxFile file;

        public IfcxFileBuilder() { 
            this.file = new IfcxFile();
        }

        public IfcxFileBuilder AddSection(string id, NodeElement node)
        {
            SectionElement sec = new();
            sec.Header = new();
            sec.Header.Id = id;
            sec.Nodes = new();
            sec.Nodes.Add(node);
            this.file.AddSection(sec);

            return this;
        }

        public IfcxFile Build()
        {
            return file;
        }
    }
}
