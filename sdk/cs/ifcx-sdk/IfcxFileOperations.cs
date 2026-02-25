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

        public static void Merge(NodeElement oldNode, NodeElement newNode)
        {
            // again lots of repetition
            foreach (var item in newNode.Children)
            {
                var match = oldNode.Children.FirstOrDefault(x => x.Name == item.Name);
                if (match == null)
                {
                    if (item.Opinion == Opinion.Value)
                    {
                        var ce = new ChildElement();
                        ce.Name = item.Name;
                        ce.Value = item.Value;
                        ce.Opinion = item.Opinion;
                        oldNode.Children.Add(ce);
                    }
                }
                else
                {
                    if (item.Opinion == Opinion.Delete)
                    {
                        oldNode.Children.RemoveAt(oldNode.Children.FindIndex(x => x.Name == item.Name));
                    }
                    else if (item.Opinion == Opinion.Value)
                    {
                        match.Name = item.Name;
                        match.Value = item.Value;
                        match.Opinion = item.Opinion;
                    }
                    else
                    {
                        // passthrough
                    }
                }
            }

            foreach (var item in newNode.Inherits)
            {
                var match = oldNode.Inherits.FirstOrDefault(x => x.Name == item.Name);
                if (match == null)
                {
                    if (item.Opinion == Opinion.Value)
                    {
                        var ce = new ChildElement();
                        ce.Name = item.Name;
                        ce.Value = item.Value;
                        ce.Opinion = item.Opinion;
                        oldNode.Inherits.Add(ce);
                    }
                }
                else
                {
                    if (item.Opinion == Opinion.Delete)
                    {
                        oldNode.Inherits.RemoveAt(oldNode.Children.FindIndex(x => x.Name == item.Name));
                    }
                    else if (item.Opinion == Opinion.Value)
                    {
                        match.Name = item.Name;
                        match.Value = item.Value;
                        match.Opinion = item.Opinion;
                    }
                    else
                    {
                        // passthrough
                    }
                }
            }

            foreach (var item in newNode.Attributes)
            {
                var match = oldNode.Attributes.FirstOrDefault(x => x.Name == item.Name);
                if (match == null)
                {
                    if (item.Opinion == Opinion.Value)
                    {
                        var ce = new AttributeElement();
                        ce.Name = item.Name;
                        ce.Value = item.Value;
                        ce.Opinion = item.Opinion;
                        oldNode.Attributes.Add(ce);
                    }
                }
                else
                {
                    if (item.Opinion == Opinion.Delete)
                    {
                        oldNode.Attributes.RemoveAt(oldNode.Attributes.FindIndex(x => x.Name == item.Name));
                    }
                    else if (item.Opinion == Opinion.Value)
                    {
                        match.Name = item.Name;
                        match.Value = item.Value;
                        match.Opinion = item.Opinion;
                    }
                    else
                    {
                        // passthrough
                    }
                }
            }
        }

        private static Dictionary<string, NodeElement> CollapseNodesByPath(IfcxFile file)
        {
            Dictionary<string, NodeElement> nodes = new();

            foreach (var sec in file.index.Sections)
            {
                foreach (var node in sec.Nodes)
                {
                    if (!nodes.ContainsKey(node.Path))
                    {
                        var n = new NodeElement();
                        n.Path = node.Path;
                        n.Children = new();
                        n.Attributes = new();
                        n.Inherits = new();
                        nodes.Add(node.Path, n);
                    }

                    Merge(nodes[node.Path], node);
                }
            }

            return nodes;
        }

        private static NodeElement DiffNodes(NodeElement oldNode, NodeElement newNode, bool markMissingFromNewAsDelete)
        {
            NodeElement result = new();
            result.Path = oldNode.Path;
            result.Children = new();
            result.Inherits = new();
            result.Attributes = new();


            // children
            {
                foreach (var item in newNode.Children)
                {
                    var match = oldNode.Children.FirstOrDefault(x => x.Name == item.Name);
                    if (match == null)
                    {
                        // create
                        result.Children.Add(item);
                    }
                    else
                    {
                        if (match.Value != item.Value)
                        {
                            // edit/overwrite
                            result.Children.Add(item);
                        }
                        else
                        {
                            // equal, no diff
                        }
                    }
                }

                if (markMissingFromNewAsDelete)
                {
                    foreach (var item in oldNode.Children)
                    {
                        var match = newNode.Children.FirstOrDefault(x => x.Name == item.Name);
                        if (match == null)
                        {
                            // delete
                            var deleteItem = new ChildElement();
                            deleteItem.Name = item.Name;
                            deleteItem.Opinion = Opinion.Delete;
                            result.Children.Add(deleteItem);
                        }
                    }
                }
            }

            // inherits
            {
                foreach (var item in newNode.Inherits)
                {
                    var match = oldNode.Inherits.FirstOrDefault(x => x.Name == item.Name);
                    if (match == null)
                    {
                        // create
                        result.Inherits.Add(item);
                    }
                    else
                    {
                        if (match.Value != item.Value)
                        {
                            // edit/overwrite
                            result.Inherits.Add(item);
                        }
                        else
                        {
                            // equal, no diff
                        }
                    }
                }

                if (markMissingFromNewAsDelete)
                {
                    foreach (var item in oldNode.Inherits)
                    {
                        var match = newNode.Inherits.FirstOrDefault(x => x.Name == item.Name);
                        if (match == null)
                        {
                            // delete
                            var deleteItem = new ChildElement();
                            deleteItem.Name = item.Name;
                            deleteItem.Opinion = Opinion.Delete;
                            result.Inherits.Add(deleteItem);
                        }
                    }
                }
            }

            // attributes
            {
                foreach (var item in newNode.Attributes)
                {
                    var match = oldNode.Attributes.FirstOrDefault(x => x.Name == item.Name);
                    if (match == null)
                    {
                        // create
                        result.Attributes.Add(item);
                    }
                    else
                    {
                        if (match.Value != item.Value)
                        {
                            // edit/overwrite
                            result.Attributes.Add(item);
                        }
                        else
                        {
                            // equal, no diff
                        }
                    }
                }

                if (markMissingFromNewAsDelete)
                {
                    foreach (var item in oldNode.Attributes)
                    {
                        var match = newNode.Attributes.FirstOrDefault(x => x.Name == item.Name);
                        if (match == null)
                        {
                            // delete
                            var deleteItem = new ChildElement();
                            deleteItem.Name = item.Name;
                            deleteItem.Opinion = Opinion.Delete;
                            result.Inherits.Add(deleteItem);
                        }
                    }
                }
            }

            return result;
        }

        public static SectionElement DiffFiles(IfcxFile oldFile, IfcxFile newFile, bool markMissingFromNewAsDelete)
        {
            var oldNodes = CollapseNodesByPath(oldFile);
            var newNodes = CollapseNodesByPath(newFile);

            // the returned section has component IDs of newFile
            var result = new SectionElement();
            result.Nodes = new();

            foreach (var item in newNodes)
            {
                var newNode = item.Value;

                if (oldNodes.ContainsKey(item.Key))
                {
                    var oldNode = oldNodes[item.Key];
                    result.Nodes.Add(DiffNodes(oldNode, newNode, markMissingFromNewAsDelete));

                }
                else
                {
                    // new
                    result.Nodes.Add(DiffNodes(new NodeElement(), newNode, markMissingFromNewAsDelete));
                }
            }

            if (markMissingFromNewAsDelete)
            {
                foreach (var item in oldNodes)
                {
                    var oldNode = item.Value;

                    if (!newNodes.ContainsKey(item.Key))
                    {
                        result.Nodes.Add(DiffNodes(oldNode, new NodeElement(), markMissingFromNewAsDelete));
                    }
                }
            }

            result.Nodes.RemoveAll(x => x.Inherits.Count == 0 && x.Children.Count == 0 && x.Attributes.Count == 0);

            return result;
        }

        public static IfcxFile Federate(IfcxFile oldFile, IfcxFile newFile, bool keepHistory)
        {
            IfcxFile returnValue = new();

            // meta is predictable
            returnValue.index.Header = newFile.index.Header;
            returnValue.index.Imports = newFile.index.Imports;
            returnValue.index.AttributeTables = oldFile.index.AttributeTables.Concat(newFile.index.AttributeTables).ToList();
            returnValue.index.AttributeTables.DistinctBy(at => at.Filename); // TODO: fix

            // TODO: this whole thing would be much easier if nodes were exploded into lists of operations

            // sections
            if (keepHistory)
            {
                // we append the change to the old file data, keeping all information 

                // add all sections of oldFile, leave component IDs as-is
                foreach (var sec in oldFile.index.Sections)
                {
                    returnValue.AddSection(sec); // todo: copy
                }

                // add all components of oldFile, leave component IDs as-is
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

                            var component = newFile.ReadRawComponent(attribute.Value.TypeId, (int)attribute.Value.ComponentIndex);
                            var id = returnValue.AddSerializedComponent(attribute.Value.TypeId, component);
                            newAttribute.Value.ComponentIndex = id;
                            newNode.Attributes.Add(newAttribute);

                        }

                        newSection.Nodes.Add(newNode);
                    }
                    
                    // add section with rewritten component IDs
                    returnValue.AddSection(newSection);
                }
            }
            else
            {
                // we append the change to the old file data, but we remove any historical data that is no longer leading

                // we do this by collecting all edits to all paths and condensing them, keeping around the original DataSection that produced it
                Dictionary<string, List<NodeLineage>> pathToNodes = new();

                // old file first, so later wins
                foreach (var sec in oldFile.index.Sections)
                {
                    foreach (var node in sec.Nodes)
                    {
                        pathToNodes.TryAdd(node.Path, new());
                        pathToNodes[node.Path].Add(new(false, sec.Header, node));
                    }
                }

                // new file second, later wins
                foreach (var sec in newFile.index.Sections)
                {
                    foreach (var node in sec.Nodes)
                    {
                        pathToNodes.TryAdd(node.Path, new());
                        pathToNodes[node.Path].Add(new(true, sec.Header, node));
                    }
                }

                Dictionary<string, SectionElement> idToSection = new();

                // pathToNodes now has an ordered list of all referenced nodes, in section order, including federation
                foreach (var item in pathToNodes)
                {
                    var path = item.Key;

                    List<string> all_children = new();
                    List<string> all_inherits = new();
                    List<string> all_attributes = new();

                    // walk backwards, newest first, so we can detect unique writes
                    for (int i = item.Value.Count - 1; i >= 0; i--)
                    {
                        var lineage = item.Value[i];
                        var node = lineage.node;

                        var resultNodeForThisLineage = new NodeElement();
                        resultNodeForThisLineage.Children = new();
                        resultNodeForThisLineage.Attributes = new();
                        resultNodeForThisLineage.Inherits = new();

                        // children
                        foreach (var child in node.Children)
                        {
                            if (!all_children.Contains(child.Name))
                            {
                                // not yet filled, so we are the most recent edit to change this value, so we win!

                                // check the type, if its pass through we can ignore
                                if (child.Opinion != Opinion.PassThrough)
                                {
                                    resultNodeForThisLineage.Children.Add(child);
                                }
                                all_children.Add(child.Name);   
                            }
                            else
                            {
                                // already filled, and we're going first to last, so we lost
                            }
                        }

                        // inherits
                        foreach (var inherit in node.Inherits)
                        {
                            if (!all_inherits.Contains(inherit.Name))
                            {
                                // not yet filled, so we are the most recent edit to change this value, so we win!

                                // check the type, if its pass through we can ignore
                                if (inherit.Opinion != Opinion.PassThrough)
                                {
                                    resultNodeForThisLineage.Inherits.Add(inherit);
                                }
                                all_children.Add(inherit.Name);
                            }
                            else
                            {
                                // already filled, and we're going first to last, so we lost
                            }
                        }

                        // atributes
                        foreach (var attribute in node.Attributes)
                        {
                            if (!all_attributes.Contains(attribute.Name))
                            {
                                // not yet filled, so we are the most recent edit to change this value, so we win!

                                // check the type, if its pass through we can ignore
                                if (attribute.Opinion != Opinion.PassThrough)
                                {
                                    if (attribute.Opinion == Opinion.Value)
                                    {
                                        // rewrite component
                                        var component = lineage.fromNew ? newFile.ReadRawComponent(attribute.Value.TypeId, (int)attribute.Value.ComponentIndex) : oldFile.ReadRawComponent(attribute.Value.TypeId, (int)attribute.Value.ComponentIndex);
                                        returnValue.AddSerializedComponent(attribute.Value.TypeId, component);
                                    }
                                    resultNodeForThisLineage.Attributes.Add(attribute);
                                }
                                all_children.Add(attribute.Name);
                            }
                            else
                            {
                                // already filled, and we're going first to last, so we lost
                            }
                        }

                        if (!idToSection.ContainsKey(lineage.header.Id))
                        {
                            var sec = new SectionElement();
                            sec.Header = lineage.header;
                            sec.Nodes = new();
                            idToSection.Add(lineage.header.Id, sec);
                        }

                        idToSection[lineage.header.Id].Nodes.Add(resultNodeForThisLineage);
                    }
                }

                //TODO: sort sections!

                foreach (var item in idToSection)
                {
                    item.Value.Nodes.RemoveAll(x => x.Inherits.Count == 0 && x.Children.Count == 0 && x.Attributes.Count == 0);

                    if (item.Value.Nodes.Count != 0)
                    {
                        returnValue.AddSection(item.Value);
                    }
                }
            }

            return returnValue;
        }

        public static Option<string> ValidateComponentsWithSchemas(IfcxFile ifcx)
        {
            return Option.None<string>();
        }
    }
}
