'use client' // remove later

import Image from "next/image";
import styles from "./page.module.css";
import { useState, useEffect, createRef } from 'react';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, deleteDoc } from 'firebase/firestore/lite';
import * as firebase from 'firebase/firestore/lite';

const firebaseConfig = {
  /* snip */
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function Home() {
  const [searchable_items, UpdateSearchableItems] = useState<{ [key: string]: { [price: string]: number } }>({});
  const [items_to_display, UpdateDisplayList] = useState<(string | number)[][]>([]); // [name, price]
  const [value, setValue] = useState("");
  const [numeric_string, setNumericStringValue] = useState("-1");
  const [int_string, setIntStringValue] = useState("-1");

  let input_name = createRef<HTMLInputElement>();
  let input_price = createRef<HTMLInputElement>();
  let input_quantity = createRef<HTMLInputElement>();

  const fetch_data = async function()
  {
    let dict: { [key: string] : {} } = {};
    let query_result = await getDocs(collection(db, "food"));
    query_result.forEach((doc) => {
      dict[doc.id] = doc.data();
    });
    
    UpdateSearchableItems(dict);
    populate_items_to_display(value, dict);
  }

  const populate_items_to_display = (search: string, list?: { [key: string]: { [price: string]: number } }) => {
    // Size of 0 everything gets added anyways
    let sorted = [];
    for (const [k, v] of Object.entries(list || searchable_items))
    {
      let lower = k.toLowerCase();
      let pos = lower.indexOf(search);
      if (pos >= 0) sorted.push([k, v.price, v.quantity])
    }

    UpdateDisplayList(sorted);
  }

  const update_search_query = (to_search: string) => {
    to_search = to_search.toLowerCase();
    setValue(to_search);
    populate_items_to_display(to_search);
  }

  function ValidateAndSendInput()
  {
    if (input_name.current && input_name.current.value != ""
      && input_price.current && input_price.current.value != ""
      && input_quantity.current && input_quantity.current.value != "")
    {
      const price = Number(input_price.current.value);
      if (Number.isNaN(price))
        return
      
      const quantity = Number(input_quantity.current.value);
        if (Number.isNaN(quantity))
          return

      // Send to database
      const send_data = async function(name: string)
      {
        try {
          await setDoc(doc(db, "food", name), {
            price: price,
            quantity: quantity
          });
        } catch (e) {
          console.error("Error writing document: ", e);
        }

        fetch_data(); // Re-display entries
      }

      send_data(input_name.current.value);
    }
  }

  const ForceNumber = (input: string) => {
    input = input.replace(/[^\d./g]/g, "")
    if (input == "")
    {
      setNumericStringValue("-1");
      return;
    }
    
    // Make sure an empty result of . does not fail
    let result = Number(input);
    if (Number.isNaN(result) && input[0] == ".")
    {
      input = "0" + input;
      result = Number(input);
    }

    if (!Number.isNaN(result) && result >= 0)
      setNumericStringValue(input);
  }

  const ForceInt = (input: string) => {
    input = input.replace(/[^\d/g]/g, "")
    if (input == "")
    {
      setIntStringValue("-1");
      return;
    }
    
    let result = Number(input);
    if (!Number.isNaN(result) && result >= 0)
      setIntStringValue(input);
  }

  const DeleteEntry = () => {
    if (input_name.current && input_name.current.value != "")
    {
      const delete_data = async function(food_name: string)
      {
        await deleteDoc(doc(db, "food", food_name));

        fetch_data(); // Re-display entries
      }

      delete_data(input_name.current.value);
    }
  }

  useEffect(() => {
    fetch_data();
  }, []);

  return (
    <main className={styles.main}>
      <h1>Barebones Pantry Tracker by Alex</h1>
      <div className={styles.contents}>
        <table className={`${styles.table_style}`}>
          <caption>
            <input
              className={`${styles.width_100} ${styles.search_box}`}
              type="text"
              placeholder="Search Items"
              value={value}
              onChange={ (e) => update_search_query(e.target.value) }
            />
          </caption>
          <thead>
            <tr>
              <th>Name</th>
              <th className={styles.width_10}>Price</th>
              <th className={styles.width_10}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {
              items_to_display.length > 0 &&
              items_to_display.map((item, i) => <tr>
                  <td>{item[0]}</td>
                  <td>{`\$${item[1]}`}</td>
                  <td>{item[2]}</td>
                </tr>
              )
            }
          </tbody>
        </table>
        <div className={styles.description}>
          <p>Update Entries</p>
          <p>Name:{" "}
            <input
              ref={input_name}
              type="text"
            />
          </p>
          <p>Price:{" "}
            <input
              ref={input_price}
              value={Number(numeric_string) >= 0 && numeric_string || ""}
              type="text"
              onChange={ (e) => ForceNumber(e.target.value) }
            />
          </p>
          <p>Quantity:{" "}
            <input
              ref={input_quantity}
              value={Number(int_string) >= 0 && int_string || ""}
              type="text"
              onChange={ (e) => ForceInt(e.target.value) }
            />
          </p>
        </div>
        <button onClick={ValidateAndSendInput}>Add</button>
        <button onClick={DeleteEntry}>Delete</button>
      </div>
    </main>
  );
}
