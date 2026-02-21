using Application;

namespace Test
{
    public class Roundtrip
    {
        [Fact]
        public async Task CreateLayer()
        {
            var fs = new InMemoryFileSystem();
            var svc = new LayerService(fs, "::in_mem");

            Guid layer_guid = Guid.NewGuid();
            await svc.CreateLayerAsync("My Layer", layer_guid);
            var layer = await svc.GetLayerAsync(layer_guid);

            Assert.NotNull(layer);
            Assert.Equal(layer_guid, layer.id);
            Assert.Equal("My Layer", layer.name);
            Assert.Empty(layer.versions);
        }

        [Fact]
        public async Task CreateLayerVersion()
        {
            var fs = new InMemoryFileSystem();
            var svc = new LayerService(fs, "::in_mem");
            await using var stream = File.OpenRead("../../../data/example.ifcx");
            var blobId = Guid.NewGuid();
            await svc.UploadFileAsync(blobId, stream);

            Guid layer_guid = Guid.NewGuid();
            Guid version_guid = Guid.NewGuid();
            await svc.CreateLayerAsync("My Layer", layer_guid);
            await svc.CreateLayerVersionAsync(layer_guid, version_guid, Guid.Empty, blobId);

            var version = (await svc.GetLayerAsync(layer_guid)).versions[0];

            Assert.Equal(blobId, version.uploadedBlobId);
        }
    }
}
