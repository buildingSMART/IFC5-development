using ApiSdk.Models;
using Optional;
using QuickType;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ifcx_sdk
{
    public class IfcxFileOperations
    {
        record NodeLineage
        (
            bool fromNew,
            SectionHeader header,
            NodeElement node
        );

        public static IfcxFile Diff(IfcxFile oldFile, IfcxFile newFile)
        {
            return new IfcxFile();
        }

        public static IfcxFile Federate(IfcxFile oldFile, IfcxFile newFile, bool keepHistory)
        {
            IfcxFile returnValue = new();

            // meta
            returnValue.index.Header = newFile.index.Header;
            returnValue.index.Imports = newFile.index.Imports;
            returnValue.index.AttributeTables = oldFile.index.AttributeTables.Concat(newFile.index.AttributeTables).ToArray();
            returnValue.index.AttributeTables.DistinctBy(at => at.Filename); // TODO: fix

            // sections
            if (keepHistory)
            {
                foreach (var sec in oldFile.index.Sections)
                {
                    returnValue.AddSection(sec); // todo: copy
                }

                foreach (var item in oldFile.serializedComponents)
                {
                    foreach (var component in item.Value)
                    {
                        returnValue.AddSerializedComponent(item.Key, component);
                    }
                }

                var componentCounts = oldFile.ComponentTypeCounts();

                foreach (var sec in newFile.index.Sections)
                {
                    var newSection = new SectionElement();
                    newSection.Header = sec.Header;
                    newSection.Nodes = [];

                    foreach (var node in sec.Nodes)
                    {
                        var newNode = new NodeElement();
                        newNode.Path = node.Path;
                        newNode.Inherits = node.Inherits;
                        newNode.Children = node.Children;
                        newNode.Attributes = [];

                        foreach (var attribute in node.Attributes)
                        {
                            AttributeElement newAttribute = new();
                            newAttribute.Name = attribute.Name;
                            newAttribute.Value = new Value();
                            newAttribute.Value.TypeId = attribute.Value.TypeId;
                            
                            var component = newFile.ReadRawComponent(attribute.Value.TypeId, (int)attribute.Value.ComponentIndex)
                            var id = returnValue.AddSerializedComponent(attribute.Value.TypeId, component);
                            newAttribute.Value.ComponentIndex = id;
                            newNode.Attributes.Append(newAttribute);

                        }

                        newSection.Nodes.Append(newNode);
                    }

                    returnValue.AddSection(newSection);
                }
            }
            else
            {
                // now we clean each path to remove any duplicate or removed information
                Dictionary<string, List<NodeLineage>> pathToNodes = new();
                foreach (var sec in oldFile.index.Sections)
                {
                    foreach (var node in sec.Nodes)
                    {
                        pathToNodes.TryAdd(node.Path, new());
                        pathToNodes[node.Path].Add(new(false, sec.Header, node));
                    }
                }
                foreach (var sec in newFile.index.Sections)
                {
                    foreach (var node in sec.Nodes)
                    {
                        pathToNodes.TryAdd(node.Path, new());
                        pathToNodes[node.Path].Add(new(true, sec.Header, node));
                    }
                }

                // pathToNodes now has an ordered list of all referenced nodes, in section order, including federation

            }

            // components
            if (keepHistory)
            {
                foreach (var kv in oldFile.serializedComponents)
                {

                }
            }
            else
            {

            }

            return new IfcxFile();
        }

        public static Option<string> ValidateComponentsWithSchemas(IfcxFile ifcx)
        {
            return Option.None<string>();
        }
    }
}
