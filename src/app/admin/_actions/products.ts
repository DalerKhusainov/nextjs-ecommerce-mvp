"use server";

import db from "@/db/db";
import { z } from "zod";
import fs from "fs/promises"; // FS/PROMISSES IS MUCH EASIER TO WORK IN MODERN JS
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// CREATING OUR OWN FILE SCHEMA. WE'RE SAYING THAT THIS OBJECT (FILE) MUST BE AN ENSTANCE OF THE FILE
const fileSchema = z.instanceof(File, { message: "Required" });
// THIS IMAGE SCHEMA SAYS IS IF MY FILE SIZE IS ZERO THAT MEANS I DID NOT SUBMIT A FILE AT ALL, SO I'M JUST GOING ESSENTIALLY IGNORE FIRST CHECK COMPLETELY
// SO IF I DID NOT SUBMIT A FILE JUST DON'T DO THIS CHECK. BUT IF I DID SUBMIT A FILE CHECK TO MAKE SURE THE FILE TYPE OF THAT IS OF SOME FORM OF IMAGE
// WHETHER PNG JPEG IT DOEN'T MATTER. THE TYPE WILL START WITH "image/" IF IT'S AN SPECIFIC FILE.
const imageSchema = fileSchema.refine(
  (file) => file.size === 0 || file.type.startsWith("image/")
);

const addSchema = z.object({
  name: z.string().min(1),
  priceInCents: z.coerce.number().int().min(1), // coerce.number CONVERTS STRINGD INTO NUMBER
  // THE REASON WE'RE DOING OUR SIZE CHECKS DOWN HERE INSTEAD OF DOING UP THERE (LINES OF 6 AND 10)
  // IS BECAUSE WHEN WE ADD A BRAND NEW FORM OR A BRAND NEW PRODUCT, OUR IMAGE AND OUR FILE ARE REQUIRED.
  // WHEN WE EDIT A PRODUCT WE DON'T NEED TO SPECIFY A NEW FILE OR A NEW IMAGE, SO WHEN WE DO OUR EDITING THESE (LINES OF 19 AND 20)
  // WILL ACTUALLY BE OPTIONAL FIELDS, WHICH IS WHY THE ACTUAL SECTION THAT CHECKS THE SIZE IS ONLY INSIDE THE SCHEMA FOR ADDING.
  description: z.string().min(1),
  file: fileSchema.refine((file) => file.size > 0, "Required"),
  image: imageSchema.refine((file) => file.size > 0, "Required"),
});

export async function addProduct(prevState: unknown, formData: FormData) {
  const result = addSchema.safeParse(Object.fromEntries(formData.entries()));

  if (result.success === false) {
    return result.error.formErrors.fieldErrors;
  }

  const data = result.data;
  console.log(data);

  // THIS IS FOR FILE
  // mkdir - STANDS FOR MAKE A DIRECTORY
  // HERE WE SAY STORE ALL OUR DIFFERENT PRODUCT FILES THAT THEY CAN DOWNLOAD
  // recursive: true - WE JUST MAKE SURE IF WE HAVE MULTIPLE FILES WE WANT TO CREATE THEM RECURSIVELY (рекурсивно)
  await fs.mkdir("products", { recursive: true });
  const filePath = `products/${crypto.randomUUID()}-${data.file.name}`;
  // HERE BELOW WE CAN SAVE A FILE IN OUR DATABASE. ASSENTIALLY WE'RE JUST TAKING OUR FILE WHATEVER FORMAT IT IS CURRENTLY IN
  // AND CONVERTING IT TO A FILE. NODEJS KNOWS HOW TO USE TO WRITE A FILE
  await fs.writeFile(filePath, Buffer.from(await data.file.arrayBuffer()));

  // THIS IS FOR IMAGE FILE
  await fs.mkdir("public/products", { recursive: true });
  // THE REASON WE DON'T PUT "public/" (BELOW) BECAUSE WE DON'T ACTUALLY NEED TO SPECIFY THE PUBLIC FOLDER
  // THE PUBLIC FOLDER IS JUST ANY FILE THAT IS PUBLICLY AVAILABLE ON OUR SITE.
  // SO WE DON'T NEED TO PUT PUBLIC IN FRONT OF HERE (BELOW) THAT BECAUSE USE THIS URL TO RENDER OUR IMAGE.
  // IT WILL ASSUME IT IS INSIDE OF THAT PUBLIC FOLDER.
  const imagePath = `/products/${crypto.randomUUID()}-${data.image.name}`;
  await fs.writeFile(
    `public${imagePath}`,
    Buffer.from(await data.image.arrayBuffer())
  );

  await db.product.create({
    data: {
      isAvailableForPurchase: false,
      name: data.name,
      description: data.description,
      priceInCents: data.priceInCents,
      // FOR ADDING FILES WE ARE GOING TO USE FSMODULE INSIDE NODEJS
      filePath,
      imagePath,
    },
  });

  revalidatePath("/")
  revalidatePath("/products")

  redirect("/admin/products");
}

const editSchema = addSchema.extend({
  file: fileSchema.optional(),
  image: imageSchema.optional(),
});

export async function updateProduct(
  id: string,
  prevState: unknown,
  formData: FormData
) {
  const result = editSchema.safeParse(Object.fromEntries(formData.entries()));

  if (result.success === false) {
    return result.error.formErrors.fieldErrors;
  }

  const data = result.data;
  const product = await db.product.findUnique({ where: { id } });

  if (product == null) return notFound();

  let filePath = product.filePath;
  if (data.file != null && data.file.size > 0) {
    await fs.unlink(product.filePath);
    filePath = `products/${crypto.randomUUID()}-${data.file.name}`;
    await fs.writeFile(filePath, Buffer.from(await data.file.arrayBuffer()));
  }

  let imagePath = product.imagePath;
  if (data.image != null && data.image.size > 0) {
    await fs.unlink(`public${product.imagePath}`);
    imagePath = `/products/${crypto.randomUUID()}-${data.image.name}`;
    await fs.writeFile(
      `public${imagePath}`,
      Buffer.from(await data.image.arrayBuffer())
    );
  }

  await db.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      priceInCents: data.priceInCents,
      // FOR ADDING FILES WE ARE GOING TO USE FSMODULE INSIDE NODEJS
      filePath,
      imagePath,
    },
  });

  revalidatePath("/")
  revalidatePath("/products")

  redirect("/admin/products");
}

export async function toggleProductAvailability(
  id: string,
  isAvailableForPurchase: boolean
) {
  await db.product.update({
    where: { id },
    data: {
      isAvailableForPurchase,
    },
  });

  revalidatePath("/")
  revalidatePath('/products')
}

export async function deleteProduct(id: string) {
  const product = await db.product.delete({ where: { id } });

  if (product == null) notFound();

  await fs.unlink(product.filePath);
  await fs.unlink(`public${product.imagePath}`);

  revalidatePath('/')
  revalidatePath('/products')
}
