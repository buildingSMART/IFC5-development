using ApiSdk;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ifcx_sdk
{
    public interface IIfcxApiConnection
    {
        public Task CreateLayer(ApiSdk.Models.CreateLayerCommand cmd);
        public Task DeleteLayer(Guid layerId);
        public Task<ApiSdk.Models.LayerDetails> GetLayer(Guid layerId);
        public Task<List<ApiSdk.Models.LayerStatus>> ListLayers();
        public Task<ApiSdk.Models.LayerVersion> GetLayerVersion(Guid layerId, Guid versionId);
        public Task Upload(Guid blobId, Stream body);
        public Task<Stream> Download(Guid blobId);
        public Task<ApiSdk.Models.CreateLayerVersionResponse> CreateLayerVersion(Guid layerId, ApiSdk.Models.CreateLayerVersionCommand cmd);
    }

    public class IfcxApiConnection : IIfcxApiConnection
    {
        ApiClient client;

        public IfcxApiConnection() {

            var authProvider = new AnonymousAuthenticationProvider();

            var adapter = new HttpClientRequestAdapter(authProvider);

            adapter.BaseUrl = "https://api.example.com";

            this.client = new ApiClient(adapter);
        }

        public async Task CreateLayer(ApiSdk.Models.CreateLayerCommand cmd)
        {
            var result = await this.client.IfcxApi.Layers.PostAsync(cmd);
        }

        public async Task DeleteLayer(Guid layerId)
        {
            await this.client.IfcxApi.Layers[layerId].DeleteAsync();
        }

        public async Task<ApiSdk.Models.LayerDetails> GetLayer(Guid layerId)
        {
            return await this.client.IfcxApi.Layers[layerId].GetAsync();
        }

        public async Task<List<ApiSdk.Models.LayerStatus>> ListLayers()
        {
            return await this.client.IfcxApi.Layers.GetAsync();
        }

        public async Task<ApiSdk.Models.LayerVersion> GetLayerVersion(Guid layerId, Guid versionId)
        {
            return await this.client.IfcxApi.Layers[layerId].Versions[versionId].GetAsync();
        }

        public async Task Upload(Guid blobId, Stream body)
        {
            await this.client.IfcxApi.Upload[blobId].PutAsync(body, "application/octet-stream");
        }

        public async Task<Stream> Download(Guid blobId)
        {
            return await this.client.IfcxApi.Download[blobId].PutAsync();
        }

        public async Task<ApiSdk.Models.CreateLayerVersionResponse> CreateLayerVersion(Guid layerId, ApiSdk.Models.CreateLayerVersionCommand cmd)
        {
            return await this.client.IfcxApi.Layers[layerId].Versions.PostAsync(cmd);
        }
    }
}
