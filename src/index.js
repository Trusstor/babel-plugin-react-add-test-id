import * as t from "@babel/types";

export default function(
  api,
  {
    attrName = "data-test-id",
    mode = "regular", // minimal, regular, full
    ignoreElements = [
      "div",
      "input",
      "a",
      "button",
      "span",
      "p",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "img",
      "form",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "svg",
      "path",
      "g"
    ],
    additionalIgnoreElements = [],
    delimiter = "-"
  }
) {
  let isRootElement = true;
  return {
    visitor: {
      Program(path) {
        path.traverse({
          ClassDeclaration(innerPath) {
            isRootElement = true;
            const componentName = innerPath.node.id.name;
            passDownComponentName(innerPath, componentName, mode, delimiter);
          },
          VariableDeclarator(innerPath) {
            isRootElement = true;
            const componentName = innerPath.node.id.name;
            passDownComponentName(innerPath, componentName, mode, delimiter);
          },
          JSXElement(innerPath) {
            const componentName = innerPath.node.openingElement.name.name || "";
            const isRoot =
                isRootElement || innerPath.parent.type === "ReturnStatement";
            const isIgnoredElement = [
              ...ignoreElements,
              ...additionalIgnoreElements
            ].includes(componentName);

            if (
              componentName === "" ||
                componentName.includes("Fragment") ||
                (!isRoot && isIgnoredElement)
            ) {
              return;
            }
            // if has a key get its value
            const keyValue = getKey(innerPath);

            const concatComponentName = concatComponentsName(
              innerPath.node.componentName,
              isIgnoredElement ? "" : componentName,
              delimiter,
              keyValue
            );

            isRootElement = false;

            const testId = keyValue
              ? t.jsxExpressionContainer(t.identifier(concatComponentName))
              : t.stringLiteral(concatComponentName);

            innerPath.node.openingElement.attributes.push(
              t.jSXAttribute(t.jSXIdentifier(attrName), testId)
            );

            if (mode === "full") {
              passDownComponentName(innerPath, componentName, mode, delimiter);
            }
          }
        });
      }
    }
  };
}

const concatComponentsName = (
  parent = "",
  current = "",
  delimiter = "-",
  keyValue = ""
) => {
  const componentsName =
      parent && current ? `${parent}${delimiter}${current}` : parent || current;

  return keyValue
    ? `\`${componentsName}${delimiter}\${${keyValue}}\``
    : componentsName;
};

const passDownComponentName = (path, componentName, mode, delimiter) => {
  let isRootElement = true;

  path.traverse({
    JSXElement(innerPath) {
      if (mode === "minimal") {
        innerPath.node.componentName =
            isRootElement || innerPath.parent.type === "ReturnStatement"
              ? concatComponentsName(
                innerPath.node.componentName,
                componentName,
                delimiter
              )
              : null;
      } else {
        innerPath.node.componentName = concatComponentsName(
          innerPath.node.componentName,
          componentName,
          delimiter
        );
      }

      isRootElement = false;
    }
  });
};

const getKey = path => {
  const keyAttribute = path.node.openingElement.attributes.find(
    ({ name }) => name && name.name === "key"
  );

  const keyValue =
      keyAttribute && keyAttribute.value && keyAttribute.value.expression
        ? keyAttribute.value.expression.name
        : "";

  return keyValue;
};
