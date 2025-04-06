# IFC 5 development repository

Welcome to the **IFC 5 pre-alpha Examples**!  These examples are the result of years of work by many volunteers. The IFC 5 taskforce has been working on these examples inntensively in the last year. This repository contains initial examples as a proof of concept for the IFC 5 developments.

## Disclaimer: Early Stage Examples

Please note that these examples are **preliminary** and represent a direction of working for IFC 5. There are several **important caveats** to keep in mind:

1. **Incomplete Features**: Many features of IFC 5 have not been fully explored or implemented in these examples. For example header information (author, version, etc) is not included in these examples but will be in the final IFC 5.
2. **Schema Changes**: IFC 5 is still evolving, and future updates to the development will require revisions to these examples.
3. **Limited Validation**: These examples have undergone significant validation and testing. However, they are still incomplete.
4. **Known Issues**: There are known and unknown issues and incomplete sections within the examples.
5. **Development in Progress**: Further work is needed to improve the quality, accuracy, and completeness of these examples.

## Converting to alpha version

1. Create a top level object as follows:
```json

        "header": {
            "version": "ifcx_alpha",
            "author": "authorname",
            "timestamp": "time string"
        },
        "schemas": {
            ... schemas
        },
        "data": [
            ... data
        ]
```
2. Copy your previous ifcx data into the `data` array, removing the `def` and `type` specifiers, and the complete `disclaimer` object.
3. Transform your children arrays into an object, where the key is the child name, and the value is the path your child inherits from.
4. Transform your inherit arrays into an object, where the key is the name of your inherit, and the value is the path you inherit from
4. Remove any nodes that only have a name and no children/inherits/attributes
5. Remove any nested def attributes and put them in a new node, specifying the nested path as name.



## Future Development

Further **documentation will follow soon**. Also a rudimentary JSON Schema will be published soon.
We are actively working on enhancing these examples, addressing known issues. Contributions, feedback, and collaboration are welcome! If you would like to contribute or discuss the development of these examples, feel free to open an issue.
Next step in the development is to generate small assignments for people to explore. Next major milestone will be the Implementer Assembly in Budapest in February 2025 where an in-person hackathon will be organized. 

## Usage

You are welcome to clone or download this repository, but please bear in mind the current limitations and treat these examples as a **work in progress**. 
Do not create derivatives of these examples.

## Feedback and Contributions

We highly encourage feedback from the community and contributions from those familiar with IFC 5 or similar standards. Please create an issue if you would like to get involved. Please adhere to the buildingSMART behavior policy when discussing on GitHub and the forums.  

---

**Please Note**: The examples provided here are for **educational and testing purposes** only. They are not suitable for production use without further refinement.

---

Thank you for your interest, and we look forward to building out these examples together!

---
