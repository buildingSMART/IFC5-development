// GENERATED FILE -- do not edit by hand.
// Regenerate with: node viewer/build/fetch-builtin-layers.mjs

import { IfcxFile } from '../ifcx-core/schema/schema-helper';

export const BUILTIN_LAYERS: Record<string, IfcxFile> = {
  "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx": {
    "header": {
      "id": "ifc",
      "ifcxVersion": "ifcx_alpha",
      "dataVersion": "1.0.0",
      "author": "buildingSMART International",
      "timestamp": "2025-06-01"
    },
    "imports": [],
    "schemas": {
      "bsi::ifc::presentation::diffuseColor": {
        "value": {
          "dataType": "Array",
          "arrayRestrictions": {
            "value": {
              "dataType": "Real"
            }
          }
        }
      },
      "bsi::ifc::presentation::opacity": {
        "value": {
          "dataType": "Real"
        }
      },
      "bsi::ifc::class": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "code": {
                "dataType": "String"
              },
              "uri": {
                "dataType": "String"
              }
            }
          }
        }
      },
      "bsi::ifc::spaceBoundary": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "relatedelement": {
                "dataType": "Object",
                "objectRestrictions": {
                  "values": {
                    "ref": {
                      "dataType": "String"
                    }
                  }
                }
              },
              "relatingspace": {
                "dataType": "Object",
                "objectRestrictions": {
                  "values": {
                    "ref": {
                      "dataType": "String"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "bsi::ifc::material": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "code": {
                "dataType": "String"
              },
              "uri": {
                "dataType": "String"
              }
            }
          }
        }
      },
      "bsi::ifc::alignment": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "segments": {
                "dataType": "Array",
                "arrayRestrictions": {
                  "value": {
                    "dataType": "Object",
                    "objectRestrictions": {
                      "values": {
                        "ref": {
                          "dataType": "String"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "bsi::ifc::alignmenthorizontalsegment": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "SegmentLength": {
                "dataType": "Real"
              },
              "EndRadiusOfCurvature": {
                "dataType": "Real"
              },
              "GeometryType": {
                "dataType": "Enum",
                "enumRestrictions": {
                  "options": [
                    "CLOTHOID",
                    "LINE",
                    "CONSTANTGRADIENT",
                    "CIRCULARARC",
                    "CONSTANTCANT",
                    "LINEARTRANSITION"
                  ]
                }
              },
              "StartRadiusOfCurvature": {
                "dataType": "Real"
              },
              "StartPoint": {
                "dataType": "Array",
                "arrayRestrictions": {
                  "value": {
                    "dataType": "Real"
                  }
                }
              },
              "StartDirection": {
                "dataType": "Real"
              }
            }
          }
        }
      },
      "bsi::ifc::alignmentverticalsegment": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "HorizontalLength": {
                "dataType": "Real"
              },
              "RadiusOfCurvature": {
                "dataType": "Real",
                "optional": true
              },
              "EndGradient": {
                "dataType": "Real"
              },
              "StartDistAlong": {
                "dataType": "Real"
              },
              "GeometryType": {
                "dataType": "Enum",
                "enumRestrictions": {
                  "options": [
                    "CLOTHOID",
                    "LINE",
                    "CONSTANTGRADIENT",
                    "CIRCULARARC",
                    "CONSTANTCANT",
                    "LINEARTRANSITION"
                  ]
                }
              },
              "StartGradient": {
                "dataType": "Real"
              },
              "StartHeight": {
                "dataType": "Real"
              }
            }
          }
        }
      },
      "bsi::ifc::alignmentcantsegment": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "HorizontalLength": {
                "dataType": "Real"
              },
              "EndCantLeft": {
                "dataType": "Real"
              },
              "StartDistAlong": {
                "dataType": "Real"
              },
              "GeometryType": {
                "dataType": "Enum",
                "enumRestrictions": {
                  "options": [
                    "CLOTHOID",
                    "LINE",
                    "CONSTANTGRADIENT",
                    "CIRCULARARC",
                    "CONSTANTCANT",
                    "LINEARTRANSITION"
                  ]
                }
              },
              "StartCantRight": {
                "dataType": "Real"
              },
              "StartCantLeft": {
                "dataType": "Real"
              },
              "EndCantRight": {
                "dataType": "Real"
              }
            }
          }
        }
      },
      "bsi::ifc::system::connectsto": {
        "value": {
          "dataType": "Array",
          "arrayRestrictions": {
            "value": {
              "dataType": "Object",
              "objectRestrictions": {
                "values": {
                  "ref": {
                    "dataType": "String"
                  }
                }
              }
            }
          }
        }
      },
      "bsi::ifc::system::flowdirection": {
        "value": {
          "dataType": "String"
        }
      },
      "bsi::ifc::system::partofsystem": {
        "value": {
          "dataType": "Array",
          "arrayRestrictions": {
            "value": {
              "dataType": "Object",
              "objectRestrictions": {
                "values": {
                  "ref": {
                    "dataType": "String"
                  }
                }
              }
            }
          }
        }
      },
      "bsi::ifc::system::servicesfacility": {
        "value": {
          "dataType": "Array",
          "arrayRestrictions": {
            "value": {
              "dataType": "Object",
              "objectRestrictions": {
                "values": {
                  "ref": {
                    "dataType": "String"
                  }
                }
              }
            }
          }
        }
      }
    },
    "data": []
  },
  "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/prop@v5a.ifcx": {
    "header": {
      "id": "prop",
      "ifcxVersion": "ifcx_alpha",
      "dataVersion": "1.0.0",
      "author": "buildingSMART International",
      "timestamp": "2025-06-01"
    },
    "imports": [],
    "schemas": {
      "bsi::ifc::prop::Name": {
        "value": {
          "dataType": "String"
        }
      },
      "bsi::ifc::prop::Description": {
        "value": {
          "dataType": "String"
        }
      },
      "bsi::ifc::prop::UsageType": {
        "value": {
          "dataType": "String"
        }
      },
      "bsi::ifc::prop::RefElevation": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Length"
        }
      },
      "bsi::ifc::prop::ElevationOfRefHeight": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Length"
        }
      },
      "bsi::ifc::prop::ElevationOfTerrain": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Length"
        }
      },
      "bsi::ifc::prop::NumberOfStoreys": {
        "value": {
          "dataType": "Integer"
        }
      },
      "bsi::ifc::prop::IsExternal": {
        "value": {
          "dataType": "Boolean"
        }
      },
      "bsi::ifc::prop::Volume": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Volume"
        }
      },
      "bsi::ifc::prop::NetVolume": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Volume"
        }
      },
      "bsi::ifc::prop::Height": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Length"
        }
      },
      "bsi::ifc::prop::Width": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Length"
        }
      },
      "bsi::ifc::prop::Length": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Length"
        }
      },
      "bsi::ifc::prop::Depth": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Length"
        }
      },
      "bsi::ifc::prop::NetArea": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Area"
        }
      },
      "bsi::ifc::prop::NetSideArea": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Area"
        }
      },
      "bsi::ifc::prop::CrossSectionArea": {
        "value": {
          "dataType": "Real",
          "quantityKind": "Area"
        }
      },
      "bsi::ifc::prop::Station": {
        "value": {
          "dataType": "Real"
        }
      },
      "bsi::ifc::prop::TypeName": {
        "value": {
          "dataType": "String"
        }
      }
    },
    "data": []
  },
  "https://ifcx.dev/@openusd.org/usd@v1.ifcx": {
    "header": {
      "id": "usd",
      "ifcxVersion": "ifcx_alpha",
      "dataVersion": "1.0.0",
      "author": "OpenUSD",
      "timestamp": "2025-06-01"
    },
    "imports": [],
    "schemas": {
      "usd::usdgeom::mesh": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "faceVertexIndices": {
                "dataType": "Array",
                "arrayRestrictions": {
                  "value": {
                    "dataType": "Integer"
                  }
                }
              },
              "points": {
                "dataType": "Array",
                "arrayRestrictions": {
                  "value": {
                    "dataType": "Array",
                    "arrayRestrictions": {
                      "value": {
                        "dataType": "Real"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "usd::usdgeom::visibility": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "visibility": {
                "dataType": "String"
              }
            }
          }
        }
      },
      "usd::xformop": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "transform": {
                "dataType": "Array",
                "arrayRestrictions": {
                  "value": {
                    "dataType": "Array",
                    "arrayRestrictions": {
                      "value": {
                        "dataType": "Real"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "usd::usdgeom::basiscurves": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "points": {
                "dataType": "Array",
                "arrayRestrictions": {
                  "value": {
                    "dataType": "Array",
                    "arrayRestrictions": {
                      "value": {
                        "dataType": "Real"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "data": []
  },
  "https://ifcx.dev/@nlsfb/nlsfb@v1.ifcx": {
    "header": {
      "id": "nlsfb",
      "ifcxVersion": "ifcx_alpha",
      "dataVersion": "1.0.0",
      "author": "NL-SfB",
      "timestamp": "2025-06-01"
    },
    "imports": [],
    "schemas": {
      "nlsfb::class": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "code": {
                "dataType": "String"
              },
              "uri": {
                "dataType": "String"
              }
            }
          }
        }
      }
    },
    "data": []
  },
  "https://ifcx.dev/@standards.buildingsmart.org/ifc/ifc-infra/infra@v1.0.0.ifcx": {
    "header": {
      "id": "infra",
      "ifcxVersion": "ifcx_alpha",
      "dataVersion": "1.0.0",
      "author": "buildingSMART International",
      "timestamp": "2025-06-01"
    },
    "imports": [],
    "schemas": {
      "bsi::ifc-infra::prop::StartDistanceAlong": {
        "value": {
          "dataType": "Real"
        }
      },
      "bsi::ifc-infra::prop::EndMeter": {
        "value": {
          "dataType": "Real"
        }
      },
      "bsi::ifc-infra::prop::ExcavationDate": {
        "value": {
          "dataType": "DateTime"
        }
      }
    },
    "data": []
  },
  "https://ifcx.dev/@standards.buildingsmart.org/ifc/ifc-mat/ifc-mat@v1.0.0.ifcx": {
    "header": {
      "id": "ifc-mat",
      "ifcxVersion": "ifcx_alpha",
      "dataVersion": "1.0.0",
      "author": "buildingSMART International",
      "timestamp": "2025-06-01"
    },
    "imports": [],
    "schemas": {
      "bsi::ifc-mat::prop::StrengthClass": {
        "value": {
          "dataType": "String"
        }
      },
      "bsi::ifc-mat::prop::MoistureContent": {
        "value": {
          "dataType": "Real"
        }
      },
      "bsi::ifc-mat::prop::MassDensity": {
        "value": {
          "dataType": "Real"
        }
      },
      "bsi::ifc-mat::prop::GWP": {
        "value": {
          "dataType": "Object",
          "objectRestrictions": {
            "values": {
              "A1-A3": {
                "dataType": "Real"
              },
              "A4": {
                "dataType": "Real"
              },
              "A5": {
                "dataType": "Real"
              },
              "C2": {
                "dataType": "Real"
              },
              "C3": {
                "dataType": "Real"
              },
              "D": {
                "dataType": "Real"
              }
            }
          }
        }
      }
    },
    "data": []
  }
};
