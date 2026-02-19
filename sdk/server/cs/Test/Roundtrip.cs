using Application;

namespace Test
{
    public class Roundtrip
    {
        [Fact]
        public void CreateLayer()
        {
            var fs = new InMemoryFileSystem();
            var svc = new LayerService(fs, "::in_mem");


            Guid layer_guid = Guid.NewGuid();
            svc.CreateLayer("My Layer", layer_guid);
            var layer = svc.GetLayer(layer_guid);

            Assert.NotNull(layer);
            Assert.Equal(layer_guid, layer.id);
            Assert.Equal("My Layer", layer.name);
            Assert.Empty(layer.versions);
        }

        [Fact]
        public void CreateLayerVersion()
        {
            var fs = new InMemoryFileSystem();
            var svc = new LayerService(fs, "::in_mem");
            using var stream = File.OpenRead("../../../data/example.ifcx");
            var blobId = Guid.NewGuid();
            svc.UploadFile(blobId, stream);


            Guid layer_guid = Guid.NewGuid();
            Guid version_guid = Guid.NewGuid();
            svc.CreateLayer("My Layer", layer_guid);
            svc.CreateLayerVersion(layer_guid, version_guid, Guid.Empty, blobId);

            var version = svc.GetLayer(layer_guid).versions[0];

            Assert.Equal(blobId, version.uploadedBlobId);
        }
    }
}