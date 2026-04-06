---
title: "AI at the edge: when software meets hardware"
date: "March 10, 2024"
year: "2024"
author: "Ryan Yogan"
excerpt: "Exploring the intersection of machine learning and embedded systems."
---

A brief exploration of running ML models on resource-constrained hardware. From TensorFlow Lite to custom ONNX runtimes on ESP32, the edge is where AI gets real.

The cloud is easy. You have infinite compute, infinite memory, and a credit card. The edge is hard. You have 520KB of RAM, a 240MHz processor, and a battery that needs to last six months. But edge AI is where the interesting problems live — and increasingly, where the money is.

## Why the Edge Matters

Predictive maintenance on factory equipment that can't afford the 50ms round-trip to a cloud API. Wildlife cameras deployed in remote areas that need to classify species without cellular connectivity. Smart home devices that respect privacy by keeping inference entirely local — your voice assistant shouldn't need to phone home to determine that you said "turn off the lights."

The use cases keep multiplying. Agricultural sensors that detect crop disease from leaf images. Wearable devices that identify fall patterns for elderly patients. Industrial quality control cameras running defect detection at production line speeds. All of these require models that can run on hardware costing less than $10, consuming less than 100mW, and responding in under 10ms.

## The Toolchain Is Maturing Fast

TensorFlow Lite Micro, ONNX Runtime Mobile, and microTVM are making it possible to deploy real models on real hardware. The trick is quantization: converting 32-bit floating point weights to 8-bit integers without destroying accuracy. It's more art than science — some layers quantize gracefully while others collapse. Post-training quantization gets you 80% of the way there; quantization-aware training handles the rest, but requires retraining the model from scratch with simulated quantization noise.

Model pruning is the other secret weapon. Most neural networks are over-parameterized — you can remove 50-90% of the weights with minimal accuracy loss. The combination of pruning and quantization can shrink a model from 100MB to under 500KB while retaining 95%+ of its original accuracy. That's the difference between "needs a GPU" and "runs on a microcontroller."

## What I've Built

My experiments have focused on the ESP32-S3, which has a dual-core 240MHz processor and 8MB of PSRAM — luxurious by embedded standards. I've deployed image classification models (MobileNetV2 quantized to INT8), keyword spotting models for voice commands, and anomaly detection models for sensor data. The image classifier runs at about 5 frames per second, which is fast enough for most industrial applications. The keyword spotter runs in real-time with room to spare.

The developer experience is still rough compared to cloud ML, but it's improving rapidly. Frameworks like Edge Impulse are making it possible to go from data collection to deployed model in an afternoon. Give it another two years and edge ML deployment will be as routine as deploying a web app.
