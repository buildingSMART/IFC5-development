using Application.model;
using ifcx_sdk;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

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

        public async Task DeleteLayerAsync(Guid layerId)
        {
            await this.fs.DeleteAsync(Path.Combine(basePath, LAYERS_PATH, layerId.ToString()));
        }

        public Stream ToStream<T>(T obj)
        {
            var text = JsonSerializer.Serialize(obj);
            byte[] bytes = Encoding.UTF8.GetBytes(text);
            return new MemoryStream(bytes);
        }

        public async Task<T> FromStreamAsync<T>(Stream stream)
        {
            using var reader = new StreamReader(stream, Encoding.UTF8);
            string text = await reader.ReadToEndAsync();
            return JsonSerializer.Deserialize<T>(text);
        }

        public async Task CreateLayerAsync(string name, Guid id)
        {
            Layer l = new Layer(name, id, new());
            await this.fs.WriteFileAsync(Path.Combine(this.basePath, LAYERS_PATH, id.ToString()), ToStream(l));
        }

        public enum CreateLayerVersionResponse
        {
            OK,
            OUT_OF_DATE
        }

        public async Task<CreateLayerVersionResponse> CreateLayerVersionAsync(Guid layerId, Guid id, Guid previousLayerVersionId, Guid blobId)
        {
            var layer = await this.GetLayerAsync(layerId);

            if (previousLayerVersionId != Guid.Empty)
            {
                if (layer.versions.Count == 0)
                    throw new Exception($"previousLayerVersionId specified but layer has no versions");

                if (!layer.versions.Exists(x => x.id == previousLayerVersionId))
                    throw new Exception($"previousLayerVersionId {previousLayerVersionId} not found");

                if (layer.versions.Last().id != previousLayerVersionId)
                    return CreateLayerVersionResponse.OUT_OF_DATE;
            }

            if (!await this.fs.ExistsAsync(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString())))
                throw new Exception($"Blobid {blobId} not found");

            var stream = await this.fs.ReadFileAsync(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString()));
            var memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;
            var ifcxFile = IfcxFile.ReadIfcxFile(memoryStream);

            if (ifcxFile.index.Sections.Length == 0)
                throw new Exception("Expected at least one data section in the IfcxFile");

            var firstSection = ifcxFile.index.Sections[0];
            var provenance = new LayerProvenance(
                author: firstSection.Header.Author,
                timestamp: firstSection.Header.Timestamp,
                application: firstSection.Header.Application
            );

            LayerVersion layerVersion = new LayerVersion(id, layerId, previousLayerVersionId, blobId, provenance);
            layer.versions.Add(layerVersion);

            await this.fs.WriteFileAsync(Path.Combine(this.basePath, LAYERS_PATH, layerId.ToString()), ToStream(layer));

            return CreateLayerVersionResponse.OK;
        }

        public async Task<Layer> GetLayerAsync(Guid id)
        {
            var stream = await this.fs.ReadFileAsync(Path.Combine(this.basePath, LAYERS_PATH, id.ToString()));
            return await FromStreamAsync<Layer>(stream);
        }

        public async Task<List<Layer>> ListLayersAsync()
        {
            var files = await this.fs.ListFilesAsync(Path.Combine(this.basePath, LAYERS_PATH));

            var layers = new List<Layer>();
            foreach (var file in files)
            {
                var stream = await this.fs.ReadFileAsync(file);
                layers.Add(await FromStreamAsync<Layer>(stream));
            }
            return layers;
        }

        public async Task UploadFileAsync(Guid blobId, Stream file)
        {
            await this.fs.WriteFileAsync(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString()), file);
        }

        public async Task<Stream> DownloadFileAsync(Guid blobId)
        {
            return await this.fs.ReadFileAsync(Path.Combine(this.basePath, BLOB_PATH, blobId.ToString()));
        }
    }
}
