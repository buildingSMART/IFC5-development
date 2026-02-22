using ApiSdk.Models;
using Application;
using ifcx_sdk;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Test
{
    public class ClientServerBridge
    {
        [Fact]
        public async Task TestClientServerBridgeCreateLayer()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);
            var file = new IfcxRemoteFile(bridge);

            var layerId = Guid.NewGuid();
            await file.CreateLayer("my layer", layerId);

            var layer = await ApiController.layerService.GetLayerAsync(layerId);

            Assert.NotNull(layer);
        }

        [Fact]
        public async Task TestClientServerBridgeDeleteLayer()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);
            var file = new IfcxRemoteFile(bridge);

            var layerId = Guid.NewGuid();
            await file.CreateLayer("my layer", layerId);
            await file.DeleteLayer(layerId);

            await Assert.ThrowsAsync<FileNotFoundException>(() => ApiController.layerService.GetLayerAsync(layerId));
        }

        [Fact]
        public async Task TestClientServerBridgeGetLayer()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);
            var file = new IfcxRemoteFile(bridge);

            var layerId = Guid.NewGuid();
            await file.CreateLayer("my layer", layerId);

            var layer = await file.GetLayer(layerId);

            Assert.NotNull(layer);
            Assert.Equal(layerId, layer.Id);
            Assert.Equal("my layer", layer.Name);
        }

        [Fact]
        public async Task TestClientServerBridgeListLayers()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);
            var file = new IfcxRemoteFile(bridge);

            var layerId = Guid.NewGuid();
            await file.CreateLayer("listed layer", layerId);

            var layers = await file.ListLayers();

            Assert.NotNull(layers);
            Assert.Contains(layers, l => l.Id == layerId && l.Name == "listed layer");
        }

        [Fact]
        public async Task TestClientServerBridgeGetLayerVersion()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);
            var file = new IfcxRemoteFile(bridge);

            var layerId = Guid.NewGuid();
            var versionId = Guid.NewGuid();
            var blobId = Guid.NewGuid();

            await file.CreateLayer("versioned layer", layerId);

            await using var stream = File.OpenRead("../../../data/example.ifcx");
            await file.Upload(blobId, stream);

            var cmd = new CreateLayerVersionCommand { Id = versionId, PreviousLayerVersionId = Guid.Empty, BlobId = blobId };
            await file.CreateLayerVersion(layerId, cmd);

            var version = await file.GetLayerVersion(layerId, versionId);

            Assert.NotNull(version);
            Assert.Equal(versionId, version.VersionId);
            Assert.Equal(layerId, version.LayerId);
        }

        [Fact]
        public async Task TestClientServerBridgeUploadAndDownload()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);
            var file = new IfcxRemoteFile(bridge);

            var blobId = Guid.NewGuid();
            var originalBytes = await File.ReadAllBytesAsync("../../../data/example.ifcx");

            await file.Upload(blobId, new MemoryStream(originalBytes));

            var downloadedStream = await file.Download(blobId);
            using var ms = new MemoryStream();
            await downloadedStream.CopyToAsync(ms);

            Assert.Equal(originalBytes, ms.ToArray());
        }

        [Fact]
        public async Task TestClientServerBridgeCreateLayerVersion()
        {
            var ctrl = new ApiController();
            var bridge = new ApiBridge(ctrl);
            var file = new IfcxRemoteFile(bridge);

            var layerId = Guid.NewGuid();
            var versionId = Guid.NewGuid();
            var blobId = Guid.NewGuid();

            await file.CreateLayer("versioned layer", layerId);

            await using var stream = File.OpenRead("../../../data/example.ifcx");
            await file.Upload(blobId, stream);

            var cmd = new CreateLayerVersionCommand { Id = versionId, PreviousLayerVersionId = Guid.Empty, BlobId = blobId };
            var response = await file.CreateLayerVersion(layerId, cmd);

            Assert.NotNull(response);
            Assert.Equal(CreateLayerVersionResponseState.OK, response.State);
        }
    }
}
