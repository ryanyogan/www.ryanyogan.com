---
title: "Getting started with embedded Rust"
date: "February 20, 2024"
year: "2024"
author: "Ryan Yogan"
excerpt: "A practical guide to writing firmware in Rust for ESP32 and other microcontrollers."
---

Rust's zero-cost abstractions and memory safety make it ideal for embedded systems. This guide covers setting up Embassy, flashing firmware, and building a simple sensor project.

The embedded Rust ecosystem has reached a tipping point. Embassy provides an async runtime for microcontrollers that feels almost like writing async Rust for a web server. The HAL (Hardware Abstraction Layer) crates cover most popular chips — ESP32, STM32, nRF52, RP2040. And probe-rs makes flashing and debugging almost pleasant, with a unified interface that works across debug probe vendors.

## Getting Started

Getting started is straightforward: install the target toolchain (`rustup target add thumbv7em-none-eabihf` for ARM Cortex-M), set up your probe, and write your first blinky. But the real power shows up when you start using Rust's type system to encode hardware constraints at compile time. Wrong pin configuration? Compile error. Buffer overflow? Impossible. Use-after-free in an interrupt handler? The borrow checker says no.

This is a genuine superpower for embedded development. In C, a misconfigured GPIO pin might silently corrupt memory or damage hardware. In Rust, the type system physically prevents you from using a pin configured as an input for output operations. The error happens at compile time, not when your prototype is on fire.

## Embassy: Async for Microcontrollers

Embassy deserves special attention because it fundamentally changes how you write embedded Rust. Traditional embedded code uses interrupt handlers and global mutable state — exactly the kind of programming that Rust's safety model makes difficult. Embassy replaces this with async/await syntax that looks remarkably like application-level Rust.

You define tasks as async functions, spawn them on the executor, and use channels and signals for inter-task communication. No more manually managing interrupt priorities, no more volatile global flags, no more subtle race conditions that only appear when the moon is full. The executor handles scheduling, and Rust's ownership model ensures data races are impossible.

## Why Not Just Use C?

The honest answer: for simple projects, C is still faster to prototype. The embedded Rust toolchain has friction — build times are longer, the ecosystem is younger, and Stack Overflow has fewer answers for your specific chip + peripheral combination. But for anything that needs to be reliable — medical devices, automotive systems, industrial controls — the safety guarantees are worth the startup cost. I've shipped embedded C that had subtle memory bugs hiding for months. I've never shipped embedded Rust with a memory bug, because the compiler won't let me.
