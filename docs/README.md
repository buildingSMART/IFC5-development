# IFCX documentation

## Identifiers
- Each object in IFCX should be identified by an UUID. UUIDs are supposed to be generated based on namespace/name hashed using SHA-1. 
- Example UUID: 'a42208f9-02b7-51e2-b471-27121510c673'

## Properties
- Property `dataType` must be one of 'Real', 'Boolean', 'Integer', 'String' or 'dateTime'.
  - deafult `dataType` is 'Real'.
  - The 'dateTime' format needs to be according to the ISO 8601 series, meaning: YYYY-MM-DDThh:mm:ssTZD. For example '2023-05-10', '2023-05-10T15:10:12Z' or '2023-05-10T15:10:12+02:00'.
- Properties by default have no unit or measure (undefined). 
  - Property can have a defined measure, such as Length or Volume
  - The measure takes one of the values from the standard list.  
  - Each measure has one standard unit assigned to it. In most cases the unit is comes from SI (example: metre) or common practice (example: decibel). 
  - Unit conversion, for example from the SI metre to feet or centimetre, should be handled on the software side to make sure users see and work with the units they are comfortable with. In IFCX file, the properties with specified measures are always defined in the unit of that measure.
  
## Materials