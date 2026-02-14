
import "@typespec/openapi3";
import "@typespec/http";

using Http;

@pattern("</(\\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\\}{0,1})[0-9a-zA-Z\\/]+>")
scalar path extends string;

@pattern("</[A-Za-z0-9.]+:[A-Za-z0-9]+>")
scalar attribute_uri extends string;

@pattern("</[A-Za-z0-9.]+")
scalar attribute_file_name extends string;

@route("/ifcx-api")
interface IfcxApi {
  list(@query filter: string): string[];
}