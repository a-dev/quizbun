import { faker } from "@faker-js/faker";
import { Fragment } from "react";

type Props = {
  paragraphCount?: number;
  titleCount?: number;
  element?: React.ElementType;
};

// Generates a specified number of paragraphs with optional titles. The `element` prop allows you to specify the HTML element to use for the paragraphs (default is "p"). The `titleCount` prop determines how many of titleCount should be rendered between the paragraphs evenly. For example, if `count` is 10 and `titles` is 2, it will render 2 titles evenly distributed among the 10 paragraphs. The content of the paragraphs is generated using the Faker library to create realistic placeholder text.

export function Texts({ element, paragraphCount = 10, titleCount = 0 }: Props) {
  const sections = Array.from({ length: paragraphCount }, () => faker.lorem.paragraph());
  const titles = Array.from({ length: titleCount }, () => faker.book.title());
  const titleIndices = new Set<number>();

  // Calculate evenly spaced indices for titleCount
  if (titleCount > 0) {
    const interval = Math.floor(paragraphCount / (titleCount + 1));
    for (let i = 1; i <= titleCount; i++) {
      titleIndices.add(i * interval);
    }
  }

  const Component = element || "p";
  let titleIndex = -1;
  const paragraphs = sections.map((text, index) => {
    if (titleIndices.has(index)) {
      titleIndex++;
      return (
        <Fragment key={titleIndex}>
          <h2>{titles[titleIndex]}</h2>
          <Component>{text}</Component>
        </Fragment>
      );
    }
    return <Component key={index}>{text}</Component>;
  });

  return <div style={{ display: "grid", gap: "1rem" }}>{paragraphs}</div>;
}
