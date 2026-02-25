using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.model
{
    public record LayerProvenance
    (
        string author,
        string timestamp,
        string application
    );


    public record LayerVersion
    (
        Guid id,
        Guid layerId,
        Guid previousVersionId,
        Guid uploadedBlobId,
        LayerProvenance provenance
    );


    public record Layer
    (
        string name,
        Guid id,
        List<LayerVersion> versions
    );
}
