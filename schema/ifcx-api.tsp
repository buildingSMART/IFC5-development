
import "@typespec/openapi3";
import "@typespec/http";

using Http;

@pattern("</(\\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\\}{0,1})[0-9a-zA-Z\\/]+>")
scalar path extends string;

@pattern("</[A-Za-z0-9.]+:[A-Za-z0-9]+>")
scalar attribute_uri extends string;

@pattern("</[A-Za-z0-9.]+")
scalar attribute_file_name extends string;

model LayerStatus
{
  id: string;
  latestVersion: string;
}

model LayerDetails
{
  id: string;
  latestVersion: string;
}

model LayerHistory
{
  id: string;
  versions: string[];
}

model LayerVersion
{
  layerId: string;
  versionId: string;
  previousVersionId: string;
}

model LayerVersionIfcxFile
{
  blobUrl: string;
}

model CreateLayerCommand
{
  id: string;
  name: string;
}

model UpdateLayerCommand
{
  name: string;
}

model CreateLayerVersionCommand
{
  layerId: string;
  previousLayerVersionId: string;
  blobId: string;
}

enum IfcxFileDownloadType
{
  just_this_version,
  whole_layer_history_intact,
  whole_layer_history_condensed,
  whole_layer_and_imports_history_condensed
}

@service
@route("/ifcx-api")
namespace IfcxApi {
  @route("/layers")
  namespace Layers
  {
    @get op layers(): LayerStatus[];

    @post op createLayer(version: CreateLayerCommand): OkResponse;

    @route("/{layerId}")
    namespace LayerRoutes {
      @get op get_layer(@path layerId: string): LayerDetails;
      @put op updateLayer(@path layerId: string, version: UpdateLayerCommand): OkResponse;
      @delete op delete_layer(@path layerId: string): OkResponse;
      
      @route("/history")
      @get op get_layer_history(@path layerId: string): LayerHistory;

      @route("/upload-ifcx-blob-url")
      @post op uploadIfcxBlobUrl(@path layerId: string): string;

      @route("/versions")
      namespace VersionsRoutes {
        @post op createLayerVersion(@path layerId: string, version: CreateLayerVersionCommand): OkResponse;

        @route("/{versionId}")
        namespace LayerVersionRoutes
        {
          @get op get_layer_version(@path layerId: string, @path versionId: string): LayerVersion;

          @route("/download-ifcx")
          @put op layer_ifcx(
            @path layerId: string, 
            @path versionId: string,
            @query downloadType: IfcxFileDownloadType
          ): LayerVersionIfcxFile;

          @route("query")
          op query is IfcxQueryApi.query;
        }
      }
    }
  }
}

model IfcxQueryApiResponse
{

}

interface IfcxQueryApi {
  @get op query(
    @path layerId: string,
    @path versionId: string,
    @query path: string;
    @query provenance: boolean;
    @query expandChildren: boolean;
    @query expandChildrenRecursive: boolean;
  ): IfcxQueryApiResponse;
}