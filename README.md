# PD Flow Lab

Learn VLSI physical design through an interactive flow lab and an illustrated textbook. The [Input Files textbook](https://swethangupta7.github.io/pd-flow-/input-files.html) starts with a simple signal and works through 75 animated lessons on netlists, Liberty, LEF, SDC, DEF, UPF, RC technology, SPEF, and MMMC. Practice questions and troubleshooting cases show how a physical design engineer uses the files together.

## Use it in a browser

- [Open the textbook](https://swethangupta7.github.io/pd-flow-/input-files.html)
- [Open the STA and SDC interactive field guide](https://swethangupta7.github.io/pd-flow-/sta-sdc.html)
- [Open the Flow Lab](https://swethangupta7.github.io/pd-flow-/)

The sliders and design examples are simplified teaching models. They do not run an industrial EDA tool.

## Run it locally

Use Node.js 18 or newer. The app has no dependencies to install.

```sh
git clone https://github.com/swethangupta7/pd-flow-.git pd-flow-lab
cd pd-flow-lab
npm run serve
```

Open [the local textbook](http://127.0.0.1:5173/input-files.html). To edit lesson text, diagrams, or practice questions, start with `js/input-lessons.js`, `js/input-files.js`, and `js/input-practice.js`.

The original project code and lesson material are released under the [MIT License](LICENSE). References and attributed excerpts from other projects are subject to their respective terms.
