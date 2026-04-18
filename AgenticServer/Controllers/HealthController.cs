using Microsoft.AspNetCore.Mvc;

namespace AgenticServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet("db")]
        public IActionResult CheckDb()
        {
            return Ok(new { status = "Healthy", message = "API is responding" });
        }
    }
}
