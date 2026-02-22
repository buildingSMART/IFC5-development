using ApiSdk.Models;
using Application;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Test
{
    public class ApiBridgeTest
    {
        [Fact]
        public async Task TestClientServerBridgeCreateLayer()
        {
            var bridge = new ApiBridge(new ApiController());

            var layerId = Guid.NewGuid();
            await bridge.CreateLayer(new CreateLayerCommand { Id = layerId, Name = "my layer" });

            var layer = await ApiController.layerService.GetLayerAsync(layerId);

            Assert.NotNull(layer);
        }

        [Fact]
        public async Task TestClientServerBridgeDeleteLayer()
        {
            var bridge = new ApiBridge(new ApiController());

            var layerId = Guid.NewGuid();
            await bridge.CreateLayer(new CreateLayerCommand { Id = layerId, Name = "my layer" });
            await bridge.DeleteLayer(layerId);

            await Assert.ThrowsAsync<FileNotFoundException>(() => ApiController.layerService.GetLayerAsync(layerId));
        }

        [Fact]
        public async Task TestClientServerBridgeGetLayer()
        {
            var bridge = new ApiBridge(new ApiController());

            var layerId = Guid.NewGuid();
            await bridge.CreateLayer(new CreateLayerCommand { Id = layerId, Name = "my layer" });

            var layer = await bridge.GetLayer(layerId);

            Assert.NotNull(layer);
            Assert.Equal(layerId, layer.Id);
            Assert.Equal("my layer", layer.Name);
        }

        [Fact]
        public async Task TestClientServerBridgeListLayers()
        {
            var bridge = new ApiBridge(new ApiController());

            var layerId = Guid.NewGuid();
            await bridge.CreateLayer(new CreateLayerCommand { Id = layerId, Name = "listed layer" });

            var layers = await bridge.ListLayers();

            Assert.NotNull(layers);
            Assert.Contains(layers, l => l.Id == layerId && l.Name == "listed layer");
        }

        [Fact]
        public async Task TestClientServerBridgeGetLayerVersion()
        {
            var bridge = new ApiBridge(new ApiController());

            var layerId = Guid.NewGuid();
            var versionId = Guid.NewGuid();
            var blobId = Guid.NewGuid();

            await bridge.CreateLayer(new CreateLayerCommand { Id = layerId, Name = "versioned layer" });

            await using var stream = File.OpenRead("../../../data/example.ifcx");
            await bridge.Upload(blobId, stream);

            await bridge.CreateLayerVersion(layerId, new CreateLayerVersionCommand { Id = versionId, PreviousLayerVersionId = Guid.Empty, BlobId = blobId });

            var version = await bridge.GetLayerVersion(layerId, versionId);

            Assert.NotNull(version);
            Assert.Equal(versionId, version.VersionId);
            Assert.Equal(layerId, version.LayerId);
        }

        [Fact]
        public async Task TestClientServerBridgeUploadAndDownload()
        {
            var bridge = new ApiBridge(new ApiController());

            var blobId = Guid.NewGuid();
            var originalBytes = await File.ReadAllBytesAsync("../../../data/example.ifcx");

            await bridge.Upload(blobId, new MemoryStream(originalBytes));

            var downloadedStream = await bridge.Download(blobId);
            using var ms = new MemoryStream();
            await downloadedStream.CopyToAsync(ms);

            Assert.Equal(originalBytes, ms.ToArray());
        }

        [Fact]
        public async Task TestClientServerBridgeCreateLayerVersion()
        {
            var bridge = new ApiBridge(new ApiController());

            var layerId = Guid.NewGuid();
            var versionId = Guid.NewGuid();
            var blobId = Guid.NewGuid();

            await bridge.CreateLayer(new CreateLayerCommand { Id = layerId, Name = "versioned layer" });

            await using var stream = File.OpenRead("../../../data/example.ifcx");
            await bridge.Upload(blobId, stream);

            var response = await bridge.CreateLayerVersion(layerId, new CreateLayerVersionCommand { Id = versionId, PreviousLayerVersionId = Guid.Empty, BlobId = blobId });

            Assert.NotNull(response);
            Assert.Equal(CreateLayerVersionResponseState.OK, response.State);
        }
    }
}
