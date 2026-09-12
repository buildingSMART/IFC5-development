using Application;
using ifcx_sdk;
using Optional.Unsafe;
using System.IO;

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
            var layerOpt = await svc.GetLayerAsync(layer_guid);

            Assert.True(layerOpt.HasValue);
            var layer = layerOpt.ValueOrDefault();
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

            var version = (await svc.GetLayerAsync(layer_guid)).ValueOrDefault().versions[0];

            Assert.Equal(blobId, version.uploadedBlobId);
        }

        [Fact]
        public async Task CommitAndQuery()
        {
            var fs = new InMemoryFileSystem();
            var svc = new LayerService(fs, "::in_mem");

            var ifcxFile1 = new IfcxFileBuilder()
                .AddSection("v1", 
                    new NodeElementBuilder("my_object").
                        AddChild(QuickType.Opinion.Value, "child", "c1").
                        Build()
                ).
                Build();

             var ifcxFile2 = new IfcxFileBuilder()
                .AddSection("v2",
                    new NodeElementBuilder("my_object").
                        AddChild(QuickType.Opinion.Value, "child", "c2").
                        Build()
                ).
                Build();

            var blobId1 = Guid.NewGuid();
            await svc.UploadFileAsync(blobId1, new MemoryStream(IfcxFile.WriteIfcxFile(ifcxFile1)));
            
            var blobId2 = Guid.NewGuid();
            await svc.UploadFileAsync(blobId2, new MemoryStream(IfcxFile.WriteIfcxFile(ifcxFile2)));

            Guid layer_guid = Guid.NewGuid();
            await svc.CreateLayerAsync("My Layer", layer_guid);

            Guid version_guid_1 = Guid.NewGuid();
            Guid version_guid_2 = Guid.NewGuid();

            await svc.CreateLayerVersionAsync(layer_guid, version_guid_1, Guid.Empty, blobId1);

            var result1 = await svc.Query(layer_guid, Guid.Empty, "my_object");

            await svc.CreateLayerVersionAsync(layer_guid, version_guid_2, version_guid_1, blobId2);

            var result2 = await svc.Query(layer_guid, Guid.Empty, "my_object");

            Assert.True(result1.HasValue);
            Assert.Equal("my_object", result1.ValueOrDefault().Path);
            Assert.NotEmpty(result1.ValueOrDefault().Children);
            Assert.Equal("c1", result1.ValueOrDefault().Children[0].Value);

            Assert.True(result2.HasValue);
            Assert.Equal("my_object", result2.ValueOrDefault().Path);
            Assert.NotEmpty(result2.ValueOrDefault().Children);
            Assert.Equal("c2", result2.ValueOrDefault().Children[0].Value);

        }
    }
}
