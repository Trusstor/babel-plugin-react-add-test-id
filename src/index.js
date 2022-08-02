import * as t from "@babel/types";

export default function(
  api,
  {
    attrName = "data-test-id",
    mode = "regular", // minimal, regular, full
    ignoreElements = [],
    additionalIgnoreElements = [],
    delimiter = "-"
  }
) {
  let isRootElement = true;
  let counter = 0;
  return {
    visitor: {
      Program(path) {
        path.traverse({
          ClassDeclaration(path) {
            isRootElement = true;
            const componentName = path.node.id.name;
            passDownComponentName(path, componentName, mode, delimiter, counter);
            counter ++
          },
          VariableDeclarator(path) {
            isRootElement = true;
            const componentName = path.node.id.name;
            passDownComponentName(path, componentName, mode, delimiter, counter);
            counter ++
          },
          JSXElement(path) {
            const componentName = path.node.openingElement.name.name || "";
            const isRoot =
              isRootElement || path.parent.type === "ReturnStatement";
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
            const keyValue = getKey(path);

            const concatComponentName = concatComponentsName(
              path.node.componentName,
              isIgnoredElement ? "" : componentName,
              delimiter,
              keyValue
            );

            isRootElement = false;

            const testId = keyValue
              ? t.jsxExpressionContainer(t.identifier(concatComponentName))
              : t.stringLiteral(concatComponentName);

            path.node.openingElement.attributes.push(
              t.jSXAttribute(t.jSXIdentifier(attrName), testId)
            );

            mode === "full" &&
              passDownComponentName(path, componentName, mode, delimiter, counter);
            counter ++
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
  keyValue = "",
  counter = 0
) => {
  const componentsName =
    parent && current ? `${parent}${delimiter}${current}${delimiter}${counter}` : parent || current;

  return keyValue
    ? `\`${componentsName}${delimiter}\${${keyValue}}\``
    : componentsName;
};

const passDownComponentName = (path, componentName, mode, delimiter, counter) => {
  let isRootElement = true;

  path.traverse({
    JSXElement(path) {
      if (mode === "minimal") {
        path.node.componentName =
          isRootElement || path.parent.type === "ReturnStatement"
            ? concatComponentsName(
                path.node.componentName,
                componentName,
                delimiter,
                counter
              )
            : null;
      } else {
        path.node.componentName = concatComponentsName(
          path.node.componentName,
          componentName,
          delimiter,
          counter
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
