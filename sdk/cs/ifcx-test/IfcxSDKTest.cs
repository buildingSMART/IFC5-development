using examples_ifc5_mycomponent;
using ifcx_sdk;
using QuickType;

namespace ifcx_test
{
    public class IfcxSDKTest
    {
        private ChildElement MakeChild(Opinion o, string name, string value)
        {
            var c = new ChildElement();

            c.Opinion = o;  
            c.Name = name;
            c.Value = value;  

            return c;
        }

        private IfcxFile GenTestFile(string versionId, ChildElement? child)
        {
            var returnValue = new IfcxFile();

            var node = new NodeElement();
            node.Path = "path";
            node.Children = new();
            node.Inherits = new();
            node.Attributes = new();
            
            if (child != null)
            {
                node.Children.Add(child);
            }

            var section = new SectionElement();
            section.Header = new();
            section.Header.Id = versionId;
            section.Nodes = new List<NodeElement>();
            section.Nodes.Add(node);
            
            returnValue.AddSection(section);

            return returnValue;
        }

        [Fact]
        public void LoadFile()
        {
            Console.WriteLine("Hello, World!");

            byte[] bytes = File.ReadAllBytes("./../../../../../server/cs/Test/data/example.ifcx");

            MemoryStream memoryStream = new MemoryStream(bytes);

            var file = IfcxFile.ReadIfcxFile(memoryStream);

            var comp = file.ReadComponent(Mycomponent.Identity(), 1);

            Assert.Equal("Bob", comp.FirstName);
        }

        [Fact]
        public void DiffFiles_WithNewValue_ReturnsOpinionValue()
        {
            IfcxFile oldFile = GenTestFile("v1", MakeChild(Opinion.Value, "child", "child1"));
            IfcxFile newFile = GenTestFile("v2", MakeChild(Opinion.Value, "child", "child2"));

            var result = IfcxFileOperations.DiffFiles(oldFile, newFile, false);

            Assert.NotEmpty(result.Nodes);
            Assert.Equal("path", result.Nodes[0].Path);
            Assert.Equal("child", result.Nodes[0].Children[0].Name);
            Assert.Equal("child2", result.Nodes[0].Children[0].Value);
            Assert.Equal(Opinion.Value, result.Nodes[0].Children[0].Opinion);


        }

        [Fact]
        public void DiffFiles_WithSameValue_ReturnsNoChange()
        {
            IfcxFile oldFile = GenTestFile("v1", MakeChild(Opinion.Value, "child", "child1"));
            IfcxFile newFile = GenTestFile("v2", MakeChild(Opinion.Value, "child", "child1"));

            var result = IfcxFileOperations.DiffFiles(oldFile, newFile, false);

            Assert.Empty(result.Nodes);
        }

        [Fact]
        public void DiffFiles_WithoutNewValue_ReturnsOpinionDelete()
        {
            IfcxFile oldFile = GenTestFile("v1", MakeChild(Opinion.Value, "child", "child1"));
            IfcxFile newFile = GenTestFile("v2", null);

            var result = IfcxFileOperations.DiffFiles(oldFile, newFile, true);

            Assert.NotEmpty(result.Nodes);
            Assert.Equal("path", result.Nodes[0].Path);
            Assert.Equal("child", result.Nodes[0].Children[0].Name);
            Assert.Equal(Opinion.Delete, result.Nodes[0].Children[0].Opinion);
        }

        [Fact]
        public void FederateWithoutHistory_WithMultipleNames_CombinesData()
        {
            IfcxFile oldFile = GenTestFile("v1", MakeChild(Opinion.Value, "child", "child1"));
            IfcxFile newFile = GenTestFile("v2", MakeChild(Opinion.Value, "child2", "child2"));

            var result = IfcxFileOperations.Federate(oldFile, newFile, false);

            Assert.Equal(2, result.index.Sections.Count);
        }

        [Fact]
        public void FederateWithoutHistory_WithSameName_OverwritesData()
        {
            IfcxFile oldFile = GenTestFile("v1", MakeChild(Opinion.Value, "child", "child1"));
            IfcxFile newFile = GenTestFile("v2", MakeChild(Opinion.Value, "child", "child2"));

            var result = IfcxFileOperations.Federate(oldFile, newFile, false);

            Assert.Equal(1, result.index.Sections.Count);
            Assert.Equal("child2", result.index.Sections[0].Nodes[0].Children.First().Value);
            Assert.Equal("v2", result.index.Sections[0].Header.Id);
        }

        [Fact]
        public void FederateWithHistory_WithSameName_KeepsHistory()
        {
            IfcxFile oldFile = GenTestFile("v1", MakeChild(Opinion.Value, "child", "child1"));
            IfcxFile newFile = GenTestFile("v2", MakeChild(Opinion.Value, "child", "child2"));

            var result = IfcxFileOperations.Federate(oldFile, newFile, true);

            Assert.Equal(2, result.index.Sections.Count);
            Assert.Equal("child1", result.index.Sections[0].Nodes[0].Children.First().Value);
            Assert.Equal("v1", result.index.Sections[0].Header.Id);
            Assert.Equal("child2", result.index.Sections[1].Nodes[0].Children.First().Value);
            Assert.Equal("v2", result.index.Sections[1].Header.Id);
        }
    }
}