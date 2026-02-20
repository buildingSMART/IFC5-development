using Application;
using IfcxApi.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace Test;

public class ApiControllerTests
{
    // NOTE: ApiController.layerService is static, so all instances share the same
    // in-memory store. Tests use unique GUIDs to avoid cross-test interference.

    [Fact]
    public async Task CreateLayer_ReturnsOk()
    {
        var controller = new ApiController();
        var cmd = new CreateLayerCommand { Id = Guid.NewGuid(), Name = "Test Layer" };

        var result = await controller.LayersCreateLayer(cmd);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task ListLayers_ReturnsOkWithList()
    {
        var controller = new ApiController();
        var cmd = new CreateLayerCommand { Id = Guid.NewGuid(), Name = "Listed Layer" };
        await controller.LayersCreateLayer(cmd);

        var result = await controller.LayersLayers();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetLayer_AfterCreate_ReturnsCorrectDetails()
    {
        var controller = new ApiController();
        var layerId = Guid.NewGuid();
        var cmd = new CreateLayerCommand { Id = layerId, Name = "My Layer" };
        await controller.LayersCreateLayer(cmd);

        var result = await controller.LayerRoutesGetLayer(layerId);

        var ok = Assert.IsType<OkObjectResult>(result);
        var details = Assert.IsType<LayerDetails>(ok.Value);
        Assert.Equal(layerId, details.Id);
        Assert.Equal("My Layer", details.Name);
        Assert.Empty(details.History);
    }

    [Fact]
    public async Task DeleteLayer_RemovesLayer()
    {
        var controller = new ApiController();
        var layerId = Guid.NewGuid();
        await controller.LayersCreateLayer(new CreateLayerCommand { Id = layerId, Name = "To Delete" });

        var result = await controller.LayerRoutesDeleteLayer(layerId);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task CreateLayerVersion_WithValidBlob_ReturnsOk()
    {
        var controller = new ApiController();
        var layerId = Guid.NewGuid();
        var blobId = Guid.NewGuid();
        var versionId = Guid.NewGuid();

        await controller.LayersCreateLayer(new CreateLayerCommand { Id = layerId, Name = "Versioned Layer" });

        await using var stream = File.OpenRead("../../../data/example.ifcx");
        await controller.Upload(blobId, stream);

        var cmd = new CreateLayerVersionCommand
        {
            Id = versionId,
            PreviousLayerVersionId = Guid.Empty,
            BlobId = blobId
        };
        var result = await controller.VersionsRoutesCreateLayerVersion(layerId, cmd);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<CreateLayerVersionResponse>(ok.Value);
        Assert.Equal(CreateLayerVersionResponseState.OKEnum, response.State);
    }

    [Fact]
    public async Task CreateLayerVersion_OutOfDate_ReturnsOutOfDateState()
    {
        var controller = new ApiController();
        var layerId = Guid.NewGuid();
        var blobId = Guid.NewGuid();
        var version1Id = Guid.NewGuid();
        var version2Id = Guid.NewGuid();
        var staleVersionId = Guid.NewGuid();

        await controller.LayersCreateLayer(new CreateLayerCommand { Id = layerId, Name = "OOD Layer" });

        await using var stream1 = File.OpenRead("../../../data/example.ifcx");
        await controller.Upload(blobId, stream1);

        // Create first version
        await controller.VersionsRoutesCreateLayerVersion(layerId, new CreateLayerVersionCommand
        {
            Id = version1Id,
            PreviousLayerVersionId = Guid.Empty,
            BlobId = blobId
        });

        // Create second version (advancing the head)
        await using var stream2 = File.OpenRead("../../../data/example.ifcx");
        var blobId2 = Guid.NewGuid();
        await controller.Upload(blobId2, stream2);

        await controller.VersionsRoutesCreateLayerVersion(layerId, new CreateLayerVersionCommand
        {
            Id = version2Id,
            PreviousLayerVersionId = version1Id,
            BlobId = blobId2
        });

        // Attempt to create a version based on stale previous (version1, not version2)
        await using var stream3 = File.OpenRead("../../../data/example.ifcx");
        var blobId3 = Guid.NewGuid();
        await controller.Upload(blobId3, stream3);

        var result = await controller.VersionsRoutesCreateLayerVersion(layerId, new CreateLayerVersionCommand
        {
            Id = Guid.NewGuid(),
            PreviousLayerVersionId = version1Id,
            BlobId = blobId3
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<CreateLayerVersionResponse>(ok.Value);
        Assert.Equal(CreateLayerVersionResponseState.OUTOFDATEEnum, response.State);
    }
}
