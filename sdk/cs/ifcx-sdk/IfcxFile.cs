using QuickType;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO.Compression;
using System.Linq;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace ifcx_sdk
{

    public class IfcxFile
    {
        public IfcxIndexFile index = new();
        public Dictionary<string, List<string>> serializedComponents = new();

        public IfcxFile()
        {
            index.Header = new();
            index.Header.IfcxVersion = "post-alpha";
        }

        public void AddImport(ImportElement imp)
        {
            this.index.Imports.Append(imp);
        }

        public void AddSection(SectionElement se)
        {
            this.index.Sections.Append(se);
        }

        private List<string> GetSerializedComponentsArray<T>(IfcxIdentity<T> identity)
        {
            if (!this.serializedComponents.ContainsKey(identity.typeID))
            {
                this.serializedComponents.Add(identity.typeID, new List<string>());

                var table = new AttributeTableElement();
                table.Filename = $"{identity.typeID}.ndjson";
                table.Type = TypeEnum.Ndjson;
                table.Schema = identity.originSchemaSrc;
                this.index.AttributeTables.Append(table);
            }
            return this.serializedComponents.GetValueOrDefault(identity.typeID)!;
        }


        public int AddComponent<T>(IfcxIdentity<T> id, T component)
        {
            var arr = this.GetSerializedComponentsArray(id);
            var index = arr.Count;
            var indentedStr = id.toJSONString(component);
            arr.Append(JsonSerializer.Serialize(JsonSerializer.Deserialize<JsonElement>(indentedStr))); // this dance is due to quicktype pretty printing...
            return index;
        }
        public T ReadComponent<T>(IfcxIdentity<T> id, int index)
        {
            var arr = this.GetSerializedComponentsArray(id);
            if (arr.Count <= index)
            {
                throw new Exception($"No component with index ${ index }");
            }
            return id.fromJSONString(arr[index]);
        }

        public static byte[] WriteIfcxFile(IfcxFile file)
        {
            byte[] zipBytes;

            using (var memoryStream = new MemoryStream())
            {
                using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
                {
                    var indexFile = archive.CreateEntry("index.json");

                    using (var writer = new StreamWriter(indexFile.Open(), Encoding.UTF8))
                    {
                        writer.Write(JsonSerializer.Serialize(file));
                    }

                    foreach (var id_comps in file.serializedComponents)
                    {
                        var componentsFile = archive.CreateEntry($"{id_comps.Key}.ndjson");

                        using (var writer = new StreamWriter(componentsFile.Open(), Encoding.UTF8))
                        {
                            writer.Write(string.Join("\n", id_comps));
                        }
                    }
                }

                // Important: reset position before reading
                memoryStream.Position = 0;

                zipBytes = memoryStream.ToArray();
            }

            return zipBytes;
        }

        public static IfcxFile ReadIfcxFile(MemoryStream memoryStream)
        {
            var file = new IfcxFile();

            // Open archive in Read mode
            using var archive = new ZipArchive(memoryStream, ZipArchiveMode.Read);

            var files = new Dictionary<string, string>();
            // Iterate entries
            foreach (var entry in archive.Entries)
            {
                Console.WriteLine($"Entry: {entry.FullName}");

                using var reader = new StreamReader(entry.Open(), Encoding.UTF8);
                string content = reader.ReadToEnd();

                files.Add(entry.FullName, content);
            }

            file.index = IfcxIndexFile.FromJson(files.GetValueOrDefault("index.json"));

            foreach(var entry in files)
            {
                if (entry.Key.EndsWith(".ndjson"))
                {
                    var type = entry.Key.Replace(".ndjson", "");

                    file.serializedComponents.Add(type, entry.Value.Split("\n").ToList());
                }
            }

            return file;
        }
    }
}
