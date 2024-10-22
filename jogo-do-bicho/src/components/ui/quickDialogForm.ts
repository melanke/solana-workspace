import Swal from "sweetalert2";

export type TInputText = {
  label: string;
  type: "text" | "textarea" | "date" | "number";
};

export type TinputSelect = { label: string; type: "select"; options: string[] };

export type TOptions = {
  inputs: (TInputText | TinputSelect)[];
  title: string;
};

export const quickDialogForm = async (options: TOptions): Promise<string[]> => {
  const html = options.inputs
    .map((input, index) => {
      if (input.type === "text") {
        return `<label for="swal-${index}" class="swal2-input-label">${input.label}</label><input type="text" class="swal2-input" id="swal-${index}" />`;
      }

      if (input.type === "select") {
        return `<label for="swal-${input.label}" class="swal2-input-label">${
          input.label
        }</label><select id="swal-${index}" class="swal2-select swal2-input">
        ${input.options.map(
          (option) => `<option value="${option}">${option}</option>`
        )}
      </select>`;
      }

      if (input.type === "textarea") {
        return `<label for="swal-${index}" class="swal2-input-label">${input.label}</label><textarea class="swal2-textarea swal2-input" id="swal-${index}"></textarea>`;
      }

      if (input.type === "date") {
        return `<label for="swal-${index}" class="swal2-input-label">${input.label}</label><input type="date" class="swal2-input" id="swal-${index}" />`;
      }

      if (input.type === "number") {
        return `<label for="swal-${index}" class="swal2-input-label">${input.label}</label><input type="number" class="swal2-input" id="swal-${index}" />`;
      }

      return "";
    })
    .join("");

  const preConfirm = () => {
    const values = options.inputs.map((input, index) => {
      const element = document.getElementById(`swal-${index}`);

      if (!element) return;

      return (element as HTMLInputElement).value;
    });

    const filteredValues = values.filter(
      (value): value is string => value !== undefined
    );

    return filteredValues;
  };

  const { value: formValues } = await Swal.fire({
    title: options.title,
    focusConfirm: false,
    html,
    preConfirm,
  });

  if (!formValues) throw new Error("Form values can't be undefined");

  return formValues;
};
