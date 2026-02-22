using ApiSdk.Models;
using Application;
using ifcx_sdk;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Test
{
    public class ApiBridge : IIfcxApiConnection
    {
        ApiController controller;

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
    }
}
