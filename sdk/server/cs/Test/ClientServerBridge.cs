using Application;
using ifcx_sdk;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Test
{
    public class ClientServerBridge
    {

        [Fact]
        public async Task TestClientServerBridge()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);

            var file = new IfcxRemoteFile(bridge);

            var layerId = Guid.NewGuid();
            await file.CreateLayer("my layer", layerId);

            var layer = await ApiController.layerService.GetLayerAsync(layerId);

            Assert.NotNull(layer);
        }
    }

}
