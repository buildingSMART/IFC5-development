using ApiSdk.Models;
using Application;
using ifcx_sdk;
using Microsoft.AspNetCore.Mvc;
using Optional;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Test
{
    public class ApiBridge : IIfcxApiConnection
    {
        ApiController controller;

        private static readonly JsonSerializerOptions _options = new JsonSerializerOptions
        {
            Converters = { new EnumMemberConverterFactory() }
        };

        public ApiBridge(ApiController controller)
        {
            this.controller = controller;
        }

        public async Task CreateLayer(ApiSdk.Models.CreateLayerCommand clientCmd)
        {
            var serverCmd = JsonSerializer.Deserialize<IfcxApi.Server.Models.CreateLayerCommand>(JsonSerializer.Serialize(clientCmd));
            await this.controller.LayersCreateLayer(serverCmd);
        }

        public async Task DeleteLayer(Guid layerId)
        {
            await this.controller.LayerRoutesDeleteLayer(layerId);
        }

        public async Task<Option<ApiSdk.Models.LayerDetails>> GetLayer(Guid layerId)
        {
            var result = await this.controller.LayerRoutesGetLayer(layerId);
            if (result == null)
            {
                return Option.None<LayerDetails>();
            }
            var ok = (OkObjectResult)result;
            return Option.Some(JsonSerializer.Deserialize<ApiSdk.Models.LayerDetails>(JsonSerializer.Serialize(ok.Value)));
        }

        public async Task<List<ApiSdk.Models.LayerStatus>> ListLayers()
        {
            var result = await this.controller.LayersLayers();
            var ok = (OkObjectResult)result;
            return JsonSerializer.Deserialize<List<ApiSdk.Models.LayerStatus>>(JsonSerializer.Serialize(ok.Value));
        }

        public async Task<ApiSdk.Models.LayerVersion> GetLayerVersion(Guid layerId, Guid versionId)
        {
            var result = await this.controller.LayerVersionRoutesGetLayerVersion(layerId, versionId);
            var ok = (OkObjectResult)result;
            return JsonSerializer.Deserialize<ApiSdk.Models.LayerVersion>(JsonSerializer.Serialize(ok.Value));
        }

        public async Task Upload(Guid blobId, Stream body)
        {
            await this.controller.Upload(blobId, body);
        }

        public async Task<Stream> Download(Guid blobId)
        {
            var result = await this.controller.Download(blobId);
            var fileResult = (FileStreamResult)result;
            return fileResult.FileStream;
        }

        public async Task<ApiSdk.Models.CreateLayerVersionResponse> CreateLayerVersion(Guid layerId, ApiSdk.Models.CreateLayerVersionCommand clientCmd)
        {
            var serverCmd = JsonSerializer.Deserialize<IfcxApi.Server.Models.CreateLayerVersionCommand>(JsonSerializer.Serialize(clientCmd));
            var result = await this.controller.VersionsRoutesCreateLayerVersion(layerId, serverCmd);
            var ok = (OkObjectResult)result;
            var temp = JsonSerializer.Serialize(ok.Value, _options);
            return JsonSerializer.Deserialize<ApiSdk.Models.CreateLayerVersionResponse>(temp, _options);
        }
    }
}
