# Base image with CUDA 12.1.1 development tools
FROM nvidia/cuda:12.1.1-devel-ubuntu20.04

# Environment setup
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONUNBUFFERED=1 \
    LD_LIBRARY_PATH=/usr/local/cuda/lib64:/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

# Install system dependencies and Python 3.10
RUN apt-get update && apt-get install -y \
    wget \
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
    git \
    gnupg \
    software-properties-common

# Install latest CMake
RUN wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | gpg --dearmor - | tee /etc/apt/trusted.gpg.d/kitware.gpg >/dev/null && \
    apt-add-repository "deb https://apt.kitware.com/ubuntu/ focal main" && \
    apt-get update && \
    apt-get install -y cmake

# Install Python 3.10 from deadsnakes
RUN add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && apt-get install -y \
    python3.10 python3.10-venv python3.10-dev

# Set python and pip
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 && \
    curl -sS https://bootstrap.pypa.io/get-pip.py | python

# Install PyTorch (CUDA 12.1)
RUN pip install torch==2.5.1+cu121 torchvision==0.20.1+cu121 torchaudio==2.5.1+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

# Fix keyring conflicts and install CUDA runtime libs needed by whisper.cpp
RUN rm -f /etc/apt/sources.list.d/cuda.list && \
    rm -f /usr/share/keyrings/cuda-archive-keyring.gpg && \
    wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-keyring_1.1-1_all.deb && \
    dpkg -i cuda-keyring_1.1-1_all.deb && \
    apt-get update && \
    apt-get install -y \
        cuda-cudart-12-1 \
        libcublas-12-1 \
        libcusparse-12-1 \
        libnvidia-ml-dev && \
    rm cuda-keyring_1.1-1_all.deb

# Build whisper.cpp with CUDA
WORKDIR /opt
RUN git clone https://github.com/ggerganov/whisper.cpp.git && \
    cd whisper.cpp && \
    ./models/download-ggml-model.sh base.en

# Build whisper.cpp
WORKDIR /opt/whisper.cpp
RUN mkdir build && \
    cd build && \
    cmake .. -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release && \
    cmake --build . --config Release -j$(nproc)

# Verify CUDA support and list build directory
RUN cd build && \
    ls -la && \
    find . -name "whisper-cli" && \
    ./bin/whisper-cli --help | grep -i cuda || true

# Switch to app
WORKDIR /app

# Credentials (if needed at build)
COPY app/credentials/google-credentials.json /app/credentials/google-credentials.json
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/credentials/google-credentials.json"

# Install Python requirements
COPY dockerrequirement.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r dockerrequirement.txt

# Copy app code
COPY . .

# Create upload dir
RUN mkdir -p uploads/videos

# Expose FastAPI port
EXPOSE 8000

# Start the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
