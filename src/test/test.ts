import { test } from "./util/cappucino";

import * as ComposeAlphaTest from "./compose-test"
import * as ExampleFileTest from "./example-file-test"
import * as SchemaTest from "./schema-test"
import * as WorkflowsTest from "./workflows-test"
import * as LayerStackTest from "./layer-stack-test"

ComposeAlphaTest
ExampleFileTest
SchemaTest
WorkflowsTest
LayerStackTest

test();