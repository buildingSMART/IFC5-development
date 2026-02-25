using Application.model;
using ifcx_sdk;
using Optional;
using Optional.Unsafe;
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
        static string LAYER_LATEST_PATH= "layer_latest";
        static string LAYER_VERSION_DIFF_PATH = "layer_diff";


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
        public static async Task<MemoryStream> ToMemoryStreamAsync(Stream input)
        {
            var memory = new MemoryStream();
            await input.CopyToAsync(memory);
            memory.Position = 0; // rewind
            return memory;
        }

        public async Task<CreateLayerVersionResponse> CreateLayerVersionAsync(Guid layerId, Guid id, Guid previousLayerVersionId, Guid blobId)
        {
            var layerOpt = (await this.GetLayerAsync(layerId));

            if (!layerOpt.HasValue)
            {
                throw new Exception($"Layer {layerId} not found");
            }

            var layer = layerOpt.ValueOrDefault();

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
            var newIfcxFile = IfcxFile.ReadIfcxFile(memoryStream);

            if (newIfcxFile.index.Sections.Count == 0)
                throw new Exception("Expected at least one data section in the IfcxFile");

            var firstSection = newIfcxFile.index.Sections[0];
            var provenance = new LayerProvenance(
                author: firstSection.Header.Author,
                timestamp: firstSection.Header.Timestamp,
                application: firstSection.Header.Application
            );

            LayerVersion layerVersion = new LayerVersion(id, layerId, previousLayerVersionId, blobId, provenance);
            layer.versions.Add(layerVersion);

            var latestPath = Path.Combine(this.basePath, LAYER_LATEST_PATH, $"{layerId.ToString()}_latest");
            
            if (await fs.ExistsAsync(latestPath))
            {
                var currentFederatedBlob = await this.fs.ReadFileAsync(latestPath);
                var currentFederatedIfcx = IfcxFile.ReadIfcxFile(await ToMemoryStreamAsync(currentFederatedBlob));
                var nextFederatedIfcx = IfcxFileOperations.Federate(currentFederatedIfcx, newIfcxFile, false);
                var nextFederatedBlob = IfcxFile.WriteIfcxFile(nextFederatedIfcx);
                await this.fs.WriteFileAsync(latestPath, new MemoryStream(nextFederatedBlob));
            }
            else
            {
                // version is federated
                var newFileBlob = IfcxFile.WriteIfcxFile(newIfcxFile);
                await this.fs.WriteFileAsync(latestPath, new MemoryStream(newFileBlob));
            }

            await this.fs.WriteFileAsync(Path.Combine(this.basePath, LAYERS_PATH, layerId.ToString()), ToStream(layer));
            await this.fs.WriteFileAsync(Path.Combine(this.basePath, LAYER_VERSION_DIFF_PATH, $"{layerId.ToString()}_{firstSection.Header.Id}"), stream);

            return CreateLayerVersionResponse.OK;
        }

        public async Task<Option<Layer>> GetLayerAsync(Guid id)
        {
            var path = Path.Combine(this.basePath, LAYERS_PATH, id.ToString());
            if (!(await this.fs.ExistsAsync(path)))
            {
                return Option.None<Layer>();
            }

            var stream = await this.fs.ReadFileAsync(path);
            return Option.Some(await FromStreamAsync<Layer>(stream));
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
