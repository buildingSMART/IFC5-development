using ApiSdk.Models;
using Application;
using ifcx_sdk;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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
            var serverCmd = new IfcxApi.Server.Models.CreateLayerCommand();
            serverCmd.Id = (Guid)clientCmd.Id; // kiota doesn't understand required fields
            serverCmd.Name = clientCmd.Name;
            await this.controller.LayersCreateLayer(serverCmd);
        }
    }
}
