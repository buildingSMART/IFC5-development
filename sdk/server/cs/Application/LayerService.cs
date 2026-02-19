using Application.model;
using ifcx_sdk;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static System.Net.Mime.MediaTypeNames;

namespace Application
{
    // @TODO: add layer repository

    public class LayerService
    {
        static string BLOB_PATH = "blobs";
        static string LAYERS_PATH = "layers";

        IFileSystem fs;
        string basePath = "";

        public LayerService(IFileSystem fs, string basePath)
        {
            this.fs = fs;
            this.basePath = basePath;
        }

        public void DeleteLayer(Guid layerId) {
            this.fs.Delete(Path.Combine(basePath, LAYERS_PATH, layerId.ToString()));
        }
        public Stream ToStream<T>(T obj)
        {
            var text = JsonSerializer.Serialize(obj);

            byte[] bytes = Encoding.UTF8.GetBytes(text);

            // Wrap in a MemoryStream
            Stream stream = new MemoryStream(bytes);

            return stream;
        }

        public T FromStream<T>(Stream stream)
        {
            using var reader = new StreamReader(stream, Encoding.UTF8);
            string text = reader.ReadToEnd();

            return JsonSerializer.Deserialize<T>(text);
        }

        public void CreateLayer(string name, Guid id)
        {
            Layer l = new Layer(name, id, new());
            this.fs.WriteFile(Path.Combine(this.basePath, LAYERS_PATH, id.ToString()), ToStream(l));
        }

        public enum CreateLayerVersionResponse
        {
            OK,
            OUT_OF_DATE
        }


        public CreateLayerVersionResponse CreateLayerVersion(Guid layerId, Guid id, Guid previousLayerVersionId, Guid blobId)
        {
            // check layer
            var layer = this.GetLayer(layerId);

            // check previous version
            if (previousLayerVersionId != Guid.Empty)
            {
                // check if any versions exists
                if (layer.versions.Count == 0)
                {
                    throw new Exception($"previousLayerVersionId specified but layer has no versions");
                }

                // check if previous exists
                if (!layer.versions.Exists(x => x.id ==  previousLayerVersionId))
                {
                    throw new Exception($"previousLayerVersionId {previousLayerVersionId} not found");
                }

                // check if previous matches server previous
                if (layer.versions.Last().id != previousLayerVersionId)
                {
                    return CreateLayerVersionResponse.OUT_OF_DATE;
                }
            }

            // check blob file
            if (!this.fs.Exists(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString())))
            {
                throw new Exception($"Blobid {blobId} not found");
            }

            // read blob file, validate
            var stream = this.fs.ReadFile(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString()));
            var memoryStream = new MemoryStream();
            stream.CopyTo(memoryStream); // ???? the original stream is obviously not in memory but on the planet jupiter
            memoryStream.Position = 0;
            var ifcxFile = IfcxFile.ReadIfcxFile(memoryStream);

            // check if there's at least 1 data section
            if (ifcxFile.index.Sections.Length == 0)
            {
                throw new Exception("Expected at least one data section in the IfcxFile");
            }

            // read provenance from ifcxFile
            var firstSection = ifcxFile.index.Sections[0];
            var provenance = new LayerProvenance(
                author: firstSection.Header.Author,
                timestamp: firstSection.Header.Timestamp,
                application: firstSection.Header.Application
            );

            // update
            LayerVersion layerVersion = new LayerVersion(id, layerId, previousLayerVersionId, blobId, provenance);

            layer.versions.Add(layerVersion);

            this.fs.WriteFile(Path.Combine(this.basePath, LAYERS_PATH, layerId.ToString()), ToStream(layer));

            return CreateLayerVersionResponse.OK;
        }

        public Layer GetLayer(Guid id)
        {
            var bytes = this.fs.ReadFile(Path.Combine(this.basePath, LAYERS_PATH, id.ToString()));
            return FromStream<Layer>(bytes);
        }

        public List<Layer> ListLayers()
        {
            var files = this.fs.ListFiles(Path.Combine(this.basePath, LAYERS_PATH));

            return files.Select(file => this.fs.ReadFile(file)).Select(str => FromStream<Layer>(str)).ToList();
        }

        public void UploadFile(Guid blobId, Stream file)
        {
            this.fs.WriteFile(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString()), file);
        }

        public Stream DownloadFile(Guid blobId)
        {
            return this.fs.ReadFile(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString()));
        }
    }
}
