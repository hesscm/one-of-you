FROM python:3.12-slim-bookworm@sha256:782412e85d0f0984994c290652577d4018aff08145c85b262bb63dc0c7522254

# Binary-only installation avoids executing source-build hooks and installing
# Rust/Node toolchains on the host. The wheel/native ABI is release-pinned;
# the pip report records artifact URLs and hashes for reproducibility.
COPY requirements.lock /opt/requirements.lock
RUN python -m pip install --no-cache-dir --only-binary=:all: --require-hashes \
    --report /opt/iai-install-report.json -r /opt/requirements.lock

ENV HF_HOME=/opt/models HF_HUB_DISABLE_TELEMETRY=1 \
    IAI_MCP_REM_DISABLED=1 IAI_MCP_VERSION_CHECK=0 \
    PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN python -c "from iai_mcp.embed import Embedder; Embedder()"
COPY model-lock.json verify_model.py /opt/brain/
RUN python /opt/brain/verify_model.py
RUN useradd --uid 10001 --create-home brain && mkdir -p /home/brain/.iai-mcp && \
    chown -R brain:brain /home/brain && chmod -R a+rX /opt/models

COPY bridge.py fingerprints.json /opt/brain/
USER 10001:10001
ENV HOME=/home/brain IAI_MCP_STORE=/home/brain/.iai-mcp \
    HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
WORKDIR /home/brain
ENTRYPOINT ["python", "/opt/brain/bridge.py"]
