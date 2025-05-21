# Base image with CUDA
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu20.04

# Disable MediaPipe GPU/EGL and quiet TF logs
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONUNBUFFERED=1

# System dependencies + Python 3.10
RUN apt-get update && apt-get install -y \
      ffmpeg \
      libgl1-mesa-glx \
      libegl1-mesa-dev \
      libgles2-mesa-dev \
      libosmesa6-dev \
      libglib2.0-0 \
      libsm6 \
      libxext6 \
      libxrender1 \
      build-essential \
      tzdata \
      curl \
      software-properties-common \
  && add-apt-repository ppa:deadsnakes/ppa \
  && apt-get update && apt-get install -y \
      python3.10 python3.10-venv python3.10-dev \
  && rm -rf /var/lib/apt/lists/*

# Set python and pip aliases to Python 3.10
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 \
 && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 \
 && curl -sS https://bootstrap.pypa.io/get-pip.py | python

# Install PyTorch wheels
RUN pip install torch==2.5.1+cu121 \
            torchvision==0.20.1+cu121 \
            torchaudio==2.5.1+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

# Set work directory
WORKDIR /app

# Credentials
COPY app/credentials/google-credentials.json /app/credentials/google-credentials.json
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/credentials/google-credentials.json"

# Requirements
COPY dockerrequirement.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r dockerrequirement.txt

# Copy app code
COPY . .

# Create uploads folder
RUN mkdir -p uploads/videos

# Expose FastAPI port
EXPOSE 8000

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
